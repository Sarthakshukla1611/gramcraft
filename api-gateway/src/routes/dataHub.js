const express = require('express');
const multer = require('multer');
const { parse } = require('fast-csv');
const Village = require('../models/Village');
const Project = require('../models/Project');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const { getVillageScore } = require('../services/mlClient');

const router = express.Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Validation helper for row data
function validateVillageRow(row, rowIndex) {
  const errors = [];
  const name = row.name?.trim();
  const code = row.code?.trim().toUpperCase();
  const district = row.district?.trim();
  const block = row.block?.trim();
  const pop = Number(row.population);
  const hh = Number(row.households || Math.round(pop / 5));
  const lat = Number(row.lat);
  const lng = Number(row.lng);

  if (!name) errors.push('Village name is missing');
  if (!code) errors.push('Village code is missing');
  if (!district) errors.push('District is missing');
  if (!block) errors.push('Block is missing');
  if (isNaN(pop) || pop < 0) errors.push('Invalid population');
  if (isNaN(lat) || lat < 8.0 || lat > 37.5) errors.push(`Invalid latitude (${row.lat}), must be India bounds [8.0, 37.5]`);
  if (isNaN(lng) || lng < 68.0 || lng > 97.5) errors.push(`Invalid longitude (${row.lng}), must be India bounds [68.0, 97.5]`);

  const sectors = ['sanitation', 'water', 'education', 'roads', 'electricity', 'healthcare'];
  sectors.forEach(s => {
    if (row[s] !== undefined && row[s] !== '') {
      const val = Number(row[s]);
      if (isNaN(val) || val < 0 || val > 100) {
        errors.push(`Invalid ${s} score (${row[s]}), must be between 0 and 100`);
      }
    }
  });

  return {
    rowIndex,
    isValid: errors.length === 0,
    errors,
    data: {
      name,
      code,
      district,
      block,
      population: pop,
      households: hh,
      lat,
      lng,
      sectors: {
        sanitation: Number(row.sanitation || 50),
        water: Number(row.water || 50),
        education: Number(row.education || 50),
        roads: Number(row.roads || 50),
        electricity: Number(row.electricity || 50),
        healthcare: Number(row.healthcare || 50),
      },
    },
  };
}

// POST /api/import/preview
router.post(
  '/preview',
  authenticate,
  requireRole('admin', 'district_officer', 'block_planner'),
  upload.single('file'),
  async (req, res) => {
    try {
      let csvContent = '';
      if (req.file) {
        csvContent = req.file.buffer.toString('utf-8');
      } else if (req.body.csv) {
        csvContent = req.body.csv;
      } else {
        return res.status(400).json({ success: false, error: 'No CSV file or data provided' });
      }

      const rows = [];
      const validationResults = [];

      const stream = parse({ headers: true, trim: true })
        .on('error', error => {
          return res.status(400).json({ success: false, error: `CSV parsing error: ${error.message}` });
        })
        .on('data', row => rows.push(row))
        .on('end', () => {
          rows.forEach((r, idx) => {
            validationResults.push(validateVillageRow(r, idx + 1));
          });

          const validRows = validationResults.filter(v => v.isValid).map(v => v.data);
          const errorRows = validationResults.filter(v => !v.isValid);

          return res.json({
            success: true,
            totalRows: rows.length,
            validCount: validRows.length,
            errorCount: errorRows.length,
            preview: validRows.slice(0, 10),
            errors: errorRows,
          });
        });

      stream.write(csvContent);
      stream.end();
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/import/commit
router.post(
  '/commit',
  authenticate,
  requireRole('admin', 'district_officer', 'block_planner'),
  async (req, res) => {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ success: false, error: 'Rows array required for commit' });
      }

      const committed = [];
      for (const item of rows) {
        const scoreInfo = await getVillageScore(item.sectors);

        const formattedSectors = {};
        ['sanitation', 'water', 'education', 'roads', 'electricity', 'healthcare'].forEach(sec => {
          formattedSectors[sec] = {
            score: item.sectors[sec] || 50,
            lastUpdated: new Date(),
            updatedBy: req.user._id,
          };
        });

        const village = await Village.findOneAndUpdate(
          { code: item.code.toUpperCase() },
          {
            name: item.name,
            district: item.district,
            block: item.block,
            population: item.population,
            households: item.households,
            location: {
              type: 'Point',
              coordinates: [item.lng, item.lat],
            },
            sectors: formattedSectors,
            overallScore: scoreInfo.overall_score,
            level: scoreInfo.tier,
            lastVerifiedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        committed.push(village);
      }

      await logAudit(
        req,
        'DATA_HUB_IMPORT_COMMIT',
        'Village',
        null,
        null,
        { committedCount: committed.length }
      );

      return res.json({
        success: true,
        message: `Successfully imported and verified ${committed.length} villages.`,
        count: committed.length,
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// GET /api/export/villages.csv
router.get('/export/villages.csv', optionalAuth, async (req, res) => {
  try {
    const villages = await Village.find().sort({ name: 1 });
    
    let csv = 'code,name,district,block,population,households,lat,lng,overallScore,level,sanitation,water,education,roads,electricity,healthcare\n';
    
    villages.forEach(v => {
      const [lng, lat] = v.location.coordinates;
      csv += `"${v.code}","${v.name}","${v.district}","${v.block}",${v.population},${v.households},${lat},${lng},${v.overallScore},"${v.level}",${v.sectors.sanitation.score},${v.sectors.water.score},${v.sectors.education.score},${v.sectors.roads.score},${v.sectors.electricity.score},${v.sectors.healthcare.score}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('gramcraft_villages.csv');
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Export failed' });
  }
});

// GET /api/export/projects.csv
router.get('/export/projects.csv', optionalAuth, async (req, res) => {
  try {
    const projects = await Project.find().populate('villageId', 'name code block');
    let csv = 'title,village,code,block,sector,status,budget,spent,startDate,dueDate,assignee\n';

    projects.forEach(p => {
      const vName = p.villageId?.name || '';
      const vCode = p.villageId?.code || '';
      const vBlock = p.villageId?.block || '';
      csv += `"${p.title}","${vName}","${vCode}","${vBlock}","${p.sector}","${p.status}",${p.budget},${p.spent},"${p.startDate.toISOString().slice(0,10)}","${p.dueDate.toISOString().slice(0,10)}","${p.assignee}"\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('gramcraft_projects.csv');
    return res.send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Projects export failed' });
  }
});

// GET /api/import/template.csv
router.get('/template.csv', (req, res) => {
  const template = 'code,name,district,block,population,households,lat,lng,sanitation,water,education,roads,electricity,healthcare\nMP-SEH-SAMPLE-01,Sample Village,Sehore,Ichhawar,1800,360,22.9812,77.0125,50,55,60,45,70,52\n';
  res.header('Content-Type', 'text/csv');
  res.attachment('gramcraft_import_template.csv');
  return res.send(template);
});

// GET /api/data-hub/quality
router.get('/quality', optionalAuth, async (req, res) => {
  try {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const [staleVillages, missingBoundaries, criticalCount, totalVillages] = await Promise.all([
      Village.find({ $or: [{ lastVerifiedAt: { $lt: ninetyDaysAgo } }, { lastVerifiedAt: null }] }).select('name code block lastVerifiedAt overallScore'),
      Village.find({ boundary: null }).select('name code block'),
      Village.countDocuments({ level: 'Seedling' }),
      Village.countDocuments({}),
    ]);

    const freshnessRate = totalVillages > 0 ? Math.round(((totalVillages - staleVillages.length) / totalVillages) * 100) : 100;

    return res.json({
      success: true,
      data: {
        totalVillages,
        freshnessRate,
        staleVillagesCount: staleVillages.length,
        staleVillages,
        missingBoundariesCount: missingBoundaries.length,
        criticalVillagesCount: criticalCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/gis/boundary-upload
router.post(
  '/gis/boundary-upload',
  authenticate,
  requireRole('admin', 'district_officer'),
  upload.single('file'),
  async (req, res) => {
    try {
      let geojsonString = '';
      if (req.file) {
        geojsonString = req.file.buffer.toString('utf-8');
      } else if (req.body.geojson) {
        geojsonString = req.body.geojson;
      } else {
        return res.status(400).json({ success: false, error: 'GeoJSON file or payload required' });
      }

      const geojson = JSON.parse(geojsonString);
      if (geojson.type !== 'FeatureCollection' || !Array.isArray(geojson.features)) {
        return res.status(400).json({ success: false, error: 'Invalid GeoJSON: must be a FeatureCollection' });
      }

      const matched = [];
      const unmatched = [];

      for (const feature of geojson.features) {
        const props = feature.properties || {};
        const code = props.code || props.CODE || props.census_code;
        const name = props.name || props.NAME || props.village_name;

        let village = null;
        if (code) {
          village = await Village.findOne({ code: code.toString().toUpperCase() });
        }
        if (!village && name) {
          village = await Village.findOne({ name: new RegExp(`^${name}$`, 'i') });
        }

        if (village && feature.geometry) {
          village.boundary = feature.geometry;
          await village.save();
          matched.push({ id: village._id, name: village.name, code: village.code });
        } else {
          unmatched.push({ code: code || 'N/A', name: name || 'N/A' });
        }
      }

      await logAudit(
        req,
        'GIS_BOUNDARY_UPLOAD',
        'Village',
        null,
        null,
        { matchedCount: matched.length, unmatchedCount: unmatched.length }
      );

      return res.json({
        success: true,
        message: `Boundary ingestion complete: ${matched.length} matched, ${unmatched.length} unmatched.`,
        data: {
          matchedCount: matched.length,
          unmatchedCount: unmatched.length,
          matched,
          unmatched,
        },
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: `Boundary processing error: ${error.message}` });
    }
  }
);

module.exports = router;

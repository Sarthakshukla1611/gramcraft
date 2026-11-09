const express = require('express');
const PDFDocument = require('pdfkit');
const Village = require('../models/Village');
const Project = require('../models/Project');
const SystemSetting = require('../models/SystemSetting');
const { optionalAuth } = require('../middleware/auth');
const { getRecommendations } = require('../services/mlClient');

const router = express.Router();

// Helper to draw the distinctive GramCraft header
function drawGramCraftHeader(doc, title, subtitle) {
  doc
    .rect(0, 0, doc.page.width, 70)
    .fill('#162922'); // GramCraft dark field green

  doc
    .fillColor('#F6F1E4') // Paper cream
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('GRAMCRAFT', 40, 20);

  doc
    .fontSize(10)
    .font('Helvetica')
    .text('Rural Development Planning & Monitoring Platform - Government of India', 40, 44);

  // Turmeric accent bar
  doc
    .rect(0, 70, doc.page.width, 4)
    .fill('#C4832A');

  // Title section
  doc.moveDown(2);
  doc
    .fillColor('#162922')
    .fontSize(16)
    .font('Helvetica-Bold')
    .text(title, 40, 95);

  doc
    .fillColor('#555555')
    .fontSize(10)
    .font('Helvetica')
    .text(`${subtitle} • Generated: ${new Date().toLocaleDateString('en-IN')}`, 40, 118);

  doc
    .moveTo(40, 135)
    .lineTo(doc.page.width - 40, 135)
    .strokeColor('#D1C7B7')
    .stroke();

  doc.y = 150;
}

// GET /api/reports/village/:id.pdf
router.get('/village/:id.pdf', optionalAuth, async (req, res) => {
  try {
    const village = await Village.findById(req.params.id);
    if (!village) {
      return res.status(404).json({ success: false, error: 'Village not found' });
    }

    const projects = await Project.find({ villageId: village._id });
    const settings = (await SystemSetting.findOne({ key: 'global_config' })) || {
      thresholds: { critical: 35, priority: 50, watch: 65, modelVillage: 80 },
    };
    const recommendations = await getRecommendations(
      village.name,
      village.sectors,
      settings.thresholds,
      village.population
    );

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="GramCraft_${village.name}_Report.pdf"`);
    doc.pipe(res);

    drawGramCraftHeader(
      doc,
      `VILLAGE DEVELOPMENT DOSSIER: ${village.name.toUpperCase()}`,
      `Code: ${village.code} | Block: ${village.block} | District: ${village.district}, MP`
    );

    // Key facts row
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#162922').text('EXECUTIVE SCORECARD & DEMOGRAPHICS', 40);
    doc.moveDown(0.5);

    const facts = [
      `Overall Score: ${village.overallScore} / 100`,
      `Development Tier: ${village.level}`,
      `Population: ${village.population.toLocaleString('en-IN')}`,
      `Households: ${village.households.toLocaleString('en-IN')}`,
      `Planner XP: ${village.xp} XP`,
      `Coordinates: [${village.location.coordinates[1].toFixed(4)}, ${village.location.coordinates[0].toFixed(4)}]`,
    ];

    facts.forEach(f => {
      doc.fontSize(9).font('Helvetica').fillColor('#333333').text(`• ${f}`, { indent: 10 });
    });

    doc.moveDown(1);

    // Sector scores breakdown
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#162922').text('CORE SECTOR PERFORMANCE (0 - 100)');
    doc.moveDown(0.5);

    const sectors = ['sanitation', 'water', 'education', 'roads', 'electricity', 'healthcare'];
    sectors.forEach(sec => {
      const score = village.sectors[sec]?.score || 0;
      let statusColor = '#7BAE7F'; // green
      let statusLabel = 'Healthy';
      if (score < 35) {
        statusColor = '#9E3A34';
        statusLabel = 'Critical Gap';
      } else if (score < 50) {
        statusColor = '#C4832A';
        statusLabel = 'Priority Scheme';
      } else if (score < 65) {
        statusColor = '#2E5A63';
        statusLabel = 'Watchlist';
      }

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#162922')
        .text(`${sec.toUpperCase().padEnd(14)} : `, { continued: true })
        .font('Helvetica')
        .fillColor(statusColor)
        .text(`${score}%  [${statusLabel}]`);
    });

    doc.moveDown(1);

    // AI Recommendations
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#162922').text('AI-DRIVEN PRIORITY INTERVENTIONS');
    doc.moveDown(0.5);

    if (recommendations.length === 0) {
      doc.fontSize(9).font('Helvetica').fillColor('#555555').text('No critical or priority gaps flagged. Village is performing at balanced high standards.');
    } else {
      recommendations.slice(0, 3).forEach((rec, idx) => {
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#9E3A34')
          .text(`${idx + 1}. ${rec.title} (Confidence: ${Math.round(rec.confidence * 100)}%)`)
          .font('Helvetica')
          .fillColor('#333333')
          .text(`   Rule Rationale: ${rec.reason}`, { indent: 5 })
          .text(`   Recommended Action: ${rec.action}`, { indent: 5 });
        doc.moveDown(0.3);
      });
    }

    doc.moveDown(1);

    // Projects status
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#162922').text(`PROJECT PORTFOLIO (${projects.length} Total Schemes)`);
    doc.moveDown(0.5);

    if (!projects.length) {
      doc.fontSize(9).font('Helvetica').fillColor('#555555').text('No active infrastructure schemes recorded.');
    } else {
      projects.slice(0, 5).forEach(p => {
        doc
          .fontSize(9)
          .font('Helvetica-Bold')
          .fillColor('#162922')
          .text(`• ${p.title}`, { continued: true })
          .font('Helvetica')
          .fillColor('#555555')
          .text(` - Status: ${p.status.toUpperCase()} | Budget: ₹${p.budget.toLocaleString('en-IN')}`);
      });
    }

    // Footer note
    doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .fillColor('#777777')
      .text(
        'GramCraft System Report. Data verified through digital audit logs. Produced for official district planning.',
        40,
        doc.page.height - 40,
        { align: 'center' }
      );

    doc.end();
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/reports/block/:block.pdf
router.get('/block/:block.pdf', optionalAuth, async (req, res) => {
  try {
    const block = req.params.block;
    const villages = await Village.find({ block: new RegExp(`^${block}$`, 'i') });

    if (!villages.length) {
      return res.status(404).json({ success: false, error: `Block '${block}' not found` });
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="GramCraft_${block}_Block_Summary.pdf"`);
    doc.pipe(res);

    drawGramCraftHeader(
      doc,
      `BLOCK PLANNING DOSSIER: ${block.toUpperCase()}`,
      `Total Villages: ${villages.length} | District: Sehore, Madhya Pradesh`
    );

    const avgScore = Math.round(villages.reduce((sum, v) => sum + v.overallScore, 0) / villages.length);

    doc.fontSize(11).font('Helvetica-Bold').fillColor('#162922').text('BLOCK SUMMARY INDICATORS');
    doc.moveDown(0.5);

    doc.fontSize(9).font('Helvetica').fillColor('#333333').text(`• Composite Block Average Score: ${avgScore} / 100`);
    doc.text(`• Total Tracked Gram Panchayats: ${villages.length}`);

    doc.moveDown(1);
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#162922').text('VILLAGE SCORE RANKINGS');
    doc.moveDown(0.5);

    const sorted = [...villages].sort((a, b) => b.overallScore - a.overallScore);
    sorted.forEach((v, idx) => {
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#162922')
        .text(`${(idx + 1).toString().padStart(2, '0')}. ${v.name.padEnd(20)} `, { continued: true })
        .font('Helvetica')
        .fillColor('#333333')
        .text(`Score: ${v.overallScore}%  |  Tier: ${v.level}  |  Pop: ${v.population.toLocaleString('en-IN')}`);
    });

    doc.end();
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

import React, { useState } from 'react';
import {
  Database,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Layers,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useGramStore } from '../store/useGramStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import StatusChip from '../components/common/StatusChip';
import SkeletonLoader from '../components/common/SkeletonLoader';
import { fireCelebrationConfetti } from '../components/common/Confetti';

export default function DataHubPage() {
  const queryClient = useQueryClient();
  const addToast = useGramStore((state) => state.addToast);

  const [activeTab, setActiveTab] = useState('import'); // 'import' | 'quality' | 'gis'
  const [fileToPreview, setFileToPreview] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [geojsonFile, setGeojsonFile] = useState(null);
  const [gisReport, setGisReport] = useState(null);

  // Data Quality Query
  const { data: qualityData, isLoading: qualityLoading } = useQuery({
    queryKey: ['data-quality'],
    queryFn: async () => {
      const res = await api.get('/data-hub/quality');
      return res.data?.data || null;
    },
  });

  // CSV Preview Mutation
  const previewMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      setPreviewResult(data);
      addToast(`CSV parsed: ${data.validCount} valid rows, ${data.errorCount} flagged.`, 'info');
    },
    onError: (err) => {
      addToast(err.response?.data?.error || 'CSV validation failed', 'error');
    },
  });

  // CSV Commit Mutation
  const commitMutation = useMutation({
    mutationFn: async (rows) => {
      const res = await api.post('/import/commit', { rows });
      return res.data;
    },
    onSuccess: (data) => {
      fireCelebrationConfetti();
      addToast(data.message || 'Data committed successfully!', 'success');
      setPreviewResult(null);
      setFileToPreview(null);
      queryClient.invalidateQueries(['villages-rail']);
      queryClient.invalidateQueries(['data-quality']);
    },
    onError: (err) => {
      addToast(err.response?.data?.error || 'Commit failed', 'error');
    },
  });

  // GeoJSON Ingestion Mutation
  const gisMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/gis/boundary-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      fireCelebrationConfetti();
      setGisReport(data.data);
      addToast(data.message || 'GeoJSON boundaries matched!', 'success');
      queryClient.invalidateQueries(['map-villages']);
    },
    onError: (err) => {
      addToast(err.response?.data?.error || 'Boundary upload failed', 'error');
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileToPreview(file);
      previewMutation.mutate(file);
    }
  };

  const handleGisChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setGeojsonFile(file);
      gisMutation.mutate(file);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-bold text-field-dark tracking-tight">
              Data Hub & Integrations
            </h1>
            <span className="font-mono text-xs px-2 py-0.5 rounded-sm bg-turmeric/20 text-turmeric font-semibold">
              CSV • GeoJSON • Audit
            </span>
          </div>
          <p className="text-xs font-mono text-field-dark/60 mt-1">
            Ingest bulk panchayat metrics, validate geometries, and export official planning datasets.
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <a
            href="/api/export/villages.csv"
            download
            className="px-3 py-1.5 rounded-sm border border-border-subtle hover:bg-paper-muted text-field-dark flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Villages (CSV)</span>
          </a>
          <a
            href="/api/export/projects.csv"
            download
            className="px-3 py-1.5 rounded-sm border border-border-subtle hover:bg-paper-muted text-field-dark flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Projects (CSV)</span>
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border-subtle flex gap-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('import')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'import' ? 'border-turmeric text-turmeric font-bold' : 'border-transparent text-field-dark/60'
          }`}
        >
          CSV Bulk Ingestion
        </button>
        <button
          onClick={() => setActiveTab('quality')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'quality' ? 'border-turmeric text-turmeric font-bold' : 'border-transparent text-field-dark/60'
          }`}
        >
          Data Quality & Freshness
        </button>
        <button
          onClick={() => setActiveTab('gis')}
          className={`px-3 py-2 border-b-2 font-medium transition-colors ${
            activeTab === 'gis' ? 'border-turmeric text-turmeric font-bold' : 'border-transparent text-field-dark/60'
          }`}
        >
          GIS Boundary Matcher
        </button>
      </div>

      {/* TAB 1: CSV IMPORT */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Upload card */}
          <div className="bg-paper-base dark:bg-field-panel border-2 border-dashed border-border-subtle rounded-sm p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-turmeric/10 text-turmeric flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-sm font-bold text-field-dark">Upload Village Census Dataset</h3>
              <p className="text-xs text-field-dark/60 mt-1">
                Upload CSV or Excel file with village codes, coordinates, and 6 sector scores.
              </p>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <label className="px-4 py-2 text-xs font-mono font-semibold rounded-sm bg-turmeric text-white hover:bg-turmeric-hover cursor-pointer transition-colors shadow-sm">
                <span>Select CSV File</span>
                <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
              </label>
              <a
                href="/api/import/template.csv"
                download
                className="px-3 py-2 text-xs font-mono rounded-sm border border-border-subtle hover:bg-paper-muted text-field-dark transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Blank Template</span>
              </a>
            </div>
          </div>

          {/* Validation & Preview Report */}
          {previewResult && (
            <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <div className="space-y-0.5">
                  <h3 className="font-serif text-sm font-bold text-field-dark">Validation Preview</h3>
                  <div className="text-xs font-mono text-field-dark/70">
                    <span className="text-softgreen font-semibold">{previewResult.validCount} valid</span> •{' '}
                    <span className="text-clay font-semibold">{previewResult.errorCount} with errors</span>
                  </div>
                </div>

                <button
                  onClick={() => commitMutation.mutate(previewResult.preview)}
                  disabled={commitMutation.isPending || previewResult.validCount === 0}
                  className="px-4 py-1.5 text-xs font-mono font-bold rounded-sm bg-softgreen text-field-dark hover:brightness-105 transition-colors disabled:opacity-50"
                >
                  Commit Valid Rows ({previewResult.validCount})
                </button>
              </div>

              {/* Errors report if any */}
              {previewResult.errors?.length > 0 && (
                <div className="p-3 border border-clay/40 rounded-sm bg-clay-light/20 text-xs font-mono space-y-1">
                  <div className="font-bold text-clay flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Row Validation Issues:</span>
                  </div>
                  {previewResult.errors.map((err, i) => (
                    <div key={i} className="text-[11px] text-field-dark/80">
                      Row {err.rowIndex}: {err.errors.join(', ')}
                    </div>
                  ))}
                </div>
              )}

              {/* Preview Rows Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-border-subtle text-[11px] text-field-dark/60 uppercase">
                      <th className="py-2 px-2">Code</th>
                      <th className="py-2 px-2">Name</th>
                      <th className="py-2 px-2">Block</th>
                      <th className="py-2 px-2">Population</th>
                      <th className="py-2 px-2">Coords [Lat, Lng]</th>
                      <th className="py-2 px-2">Sectors (W, S, E, R, P, H)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/30">
                    {previewResult.preview.map((r, i) => (
                      <tr key={i} className="hover:bg-paper-muted/30">
                        <td className="py-2 px-2 font-bold text-turmeric">{r.code}</td>
                        <td className="py-2 px-2 font-medium text-field-dark">{r.name}</td>
                        <td className="py-2 px-2">{r.block}</td>
                        <td className="py-2 px-2">{r.population?.toLocaleString('en-IN')}</td>
                        <td className="py-2 px-2 text-field-dark/60">
                          {r.lat.toFixed(3)}, {r.lng.toFixed(3)}
                        </td>
                        <td className="py-2 px-2 text-field-dark/70">
                          {r.sectors.water}, {r.sectors.sanitation}, {r.sectors.education}, {r.sectors.roads},{' '}
                          {r.sectors.electricity}, {r.sectors.healthcare}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DATA QUALITY */}
      {activeTab === 'quality' && (
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-5 space-y-6">
          <div className="border-b border-border-subtle pb-3">
            <h3 className="font-serif text-base font-bold text-field-dark">Data Freshness & Integrity Panel</h3>
            <p className="text-xs font-mono text-field-dark/60">
              Flagged panchayats requiring field reverification or missing geographic boundary layers.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 border border-border-subtle rounded-sm bg-paper-muted/20">
              <span className="text-[10px] font-mono text-field-dark/60 uppercase">Freshness Health Rate</span>
              <div className="text-3xl font-serif font-bold text-softgreen mt-1">
                {qualityData?.freshnessRate || 100}%
              </div>
              <div className="text-[10px] font-mono text-field-dark/50 mt-1">
                Updated within past 90 days
              </div>
            </div>

            <div className="p-4 border border-border-subtle rounded-sm bg-paper-muted/20">
              <span className="text-[10px] font-mono text-field-dark/60 uppercase">Stale Panchayats (&gt; 90 Days)</span>
              <div className="text-3xl font-serif font-bold text-turmeric mt-1">
                {qualityData?.staleVillagesCount || 0}
              </div>
              <div className="text-[10px] font-mono text-field-dark/50 mt-1">
                Field audit overdue
              </div>
            </div>

            <div className="p-4 border border-border-subtle rounded-sm bg-paper-muted/20">
              <span className="text-[10px] font-mono text-field-dark/60 uppercase">Missing Geo Boundaries</span>
              <div className="text-3xl font-serif font-bold text-teal-gram mt-1">
                {qualityData?.missingBoundariesCount || 0}
              </div>
              <div className="text-[10px] font-mono text-field-dark/50 mt-1">
                Need GeoJSON polygon upload
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GIS BOUNDARY MATCHER */}
      {activeTab === 'gis' && (
        <div className="bg-paper-base dark:bg-field-panel border border-border-subtle rounded-sm p-5 space-y-6">
          <div className="border-b border-border-subtle pb-3">
            <h3 className="font-serif text-base font-bold text-field-dark">Government Shapefile & GeoJSON Ingestion</h3>
            <p className="text-xs font-mono text-field-dark/60">
              Upload GeoJSON boundary polygons (from Bhuvan, DataMeet, or QGIS). Features automatically match by census code or village name.
            </p>
          </div>

          <div className="border-2 border-dashed border-border-subtle rounded-sm p-6 text-center space-y-3">
            <label className="px-4 py-2 text-xs font-mono font-semibold rounded-sm bg-turmeric text-white hover:bg-turmeric-hover cursor-pointer transition-colors shadow-sm inline-block">
              <span>Select GeoJSON File</span>
              <input type="file" accept=".geojson,.json" onChange={handleGisChange} className="hidden" />
            </label>
            <div className="text-[11px] font-mono text-field-dark/50">
              Recommended open source conversions: QGIS or Mapshaper (convert .shp to .geojson).
            </div>
          </div>

          {gisReport && (
            <div className="p-4 border border-softgreen/60 rounded-sm bg-softgreen-light/20 text-xs font-mono space-y-2">
              <div className="font-bold text-field-dark flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-softgreen" />
                <span>Boundary Ingestion Report:</span>
              </div>
              <div>• {gisReport.matchedCount} panchayat boundaries matched & updated.</div>
              <div>• {gisReport.unmatchedCount} features skipped (unmatched code).</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

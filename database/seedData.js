// Seed definitions for GramCraft - Sehore District, Madhya Pradesh

const BLOCKS = ['Ichhawar', 'Ashta', 'Sehore'];
const DISTRICT = 'Sehore';
const STATE = 'Madhya Pradesh';

// 30 realistic village templates across 3 blocks
const VILLAGE_DEFS = [
  // Ichhawar Block (10 villages)
  { name: 'Bijori', code: 'MP-SEH-ICH-01', block: 'Ichhawar', lat: 22.9812, lng: 77.0125, pop: 2450, hh: 480, profile: 'growing' },
  { name: 'Diwadia', code: 'MP-SEH-ICH-02', block: 'Ichhawar', lat: 23.0124, lng: 76.9942, pop: 1820, hh: 360, profile: 'critical' },
  { name: 'Brijisnagar', code: 'MP-SEH-ICH-03', block: 'Ichhawar', lat: 22.9511, lng: 77.0421, pop: 3100, hh: 620, profile: 'thriving' },
  { name: 'Semli Jadid', code: 'MP-SEH-ICH-04', block: 'Ichhawar', lat: 23.0345, lng: 77.0678, pop: 1250, hh: 240, profile: 'sprout' },
  { name: 'Amratpur', code: 'MP-SEH-ICH-05', block: 'Ichhawar', lat: 22.9234, lng: 76.9754, pop: 2890, hh: 570, profile: 'model' },
  { name: 'Jamuniya', code: 'MP-SEH-ICH-06', block: 'Ichhawar', lat: 22.9645, lng: 77.0892, pop: 1640, hh: 310, profile: 'growing' },
  { name: 'Kothri Khurd', code: 'MP-SEH-ICH-07', block: 'Ichhawar', lat: 23.0512, lng: 76.9531, pop: 980, hh: 195, profile: 'critical' },
  { name: 'Lalpur', code: 'MP-SEH-ICH-08', block: 'Ichhawar', lat: 22.9981, lng: 77.0543, pop: 2150, hh: 430, profile: 'sprout' },
  { name: 'Nayapura', code: 'MP-SEH-ICH-09', block: 'Ichhawar', lat: 22.9421, lng: 77.0112, pop: 1420, hh: 280, profile: 'growing' },
  { name: 'Pipaliya Meera', code: 'MP-SEH-ICH-10', block: 'Ichhawar', lat: 23.0231, lng: 77.0321, pop: 3400, hh: 690, profile: 'thriving' },

  // Ashta Block (10 villages)
  { name: 'Kothri Kalan', code: 'MP-SEH-ASH-01', block: 'Ashta', lat: 23.0189, lng: 76.8123, pop: 4200, hh: 820, profile: 'thriving' },
  { name: 'Pagaria Hat', code: 'MP-SEH-ASH-02', block: 'Ashta', lat: 22.9734, lng: 76.8456, pop: 2600, hh: 510, profile: 'growing' },
  { name: 'Khajuria Kasam', code: 'MP-SEH-ASH-03', block: 'Ashta', lat: 23.0456, lng: 76.7891, pop: 1750, hh: 340, profile: 'critical' },
  { name: 'Bhanwar Rasoolpur', code: 'MP-SEH-ASH-04', block: 'Ashta', lat: 22.9412, lng: 76.8321, pop: 2950, hh: 580, profile: 'growing' },
  { name: 'Chhipani', code: 'MP-SEH-ASH-05', block: 'Ashta', lat: 23.0678, lng: 76.8543, pop: 1120, hh: 220, profile: 'sprout' },
  { name: 'Metwada', code: 'MP-SEH-ASH-06', block: 'Ashta', lat: 22.9912, lng: 76.7645, pop: 3800, hh: 750, profile: 'model' },
  { name: 'Dhamanda', code: 'MP-SEH-ASH-07', block: 'Ashta', lat: 23.0312, lng: 76.8821, pop: 1540, hh: 310, profile: 'sprout' },
  { name: 'Mullani', code: 'MP-SEH-ASH-08', block: 'Ashta', lat: 22.9567, lng: 76.7991, pop: 2100, hh: 410, profile: 'critical' },
  { name: 'Beda Kalan', code: 'MP-SEH-ASH-09', block: 'Ashta', lat: 23.0789, lng: 76.8213, pop: 1890, hh: 370, profile: 'growing' },
  { name: 'Hakeempura', code: 'MP-SEH-ASH-10', block: 'Ashta', lat: 22.9234, lng: 76.8654, pop: 2340, hh: 460, profile: 'growing' },

  // Sehore Block (10 villages)
  { name: 'Barkhedi', code: 'MP-SEH-SEH-01', block: 'Sehore', lat: 23.1954, lng: 77.0845, pop: 3300, hh: 650, profile: 'thriving' },
  { name: 'Charnal', code: 'MP-SEH-SEH-02', block: 'Sehore', lat: 23.1723, lng: 77.1234, pop: 1450, hh: 290, profile: 'sprout' },
  { name: 'Doraha', code: 'MP-SEH-SEH-03', block: 'Sehore', lat: 23.2512, lng: 77.1567, pop: 5100, hh: 990, profile: 'model' },
  { name: 'Gulabpura', code: 'MP-SEH-SEH-04', block: 'Sehore', lat: 23.1412, lng: 77.0612, pop: 1880, hh: 370, profile: 'critical' },
  { name: 'Hasnabad', code: 'MP-SEH-SEH-05', block: 'Sehore', lat: 23.2234, lng: 77.0945, pop: 2750, hh: 540, profile: 'growing' },
  { name: 'Kurawar Jagir', code: 'MP-SEH-SEH-06', block: 'Sehore', lat: 23.2845, lng: 77.1123, pop: 2210, hh: 430, profile: 'sprout' },
  { name: 'Mahu Kalan', code: 'MP-SEH-SEH-07', block: 'Sehore', lat: 23.1612, lng: 77.1789, pop: 3600, hh: 710, profile: 'thriving' },
  { name: 'Rafiqganj', code: 'MP-SEH-SEH-08', block: 'Sehore', lat: 23.1891, lng: 77.0421, pop: 1980, hh: 390, profile: 'growing' },
  { name: 'Shyampur', code: 'MP-SEH-SEH-09', block: 'Sehore', lat: 23.2678, lng: 77.0754, pop: 4800, hh: 940, profile: 'model' },
  { name: 'Thuna Kalan', code: 'MP-SEH-SEH-10', block: 'Sehore', lat: 23.1234, lng: 77.1423, pop: 1670, hh: 330, profile: 'critical' },
];

// Profile initial baseline score ranges
const PROFILE_RANGES = {
  critical: { min: 22, max: 34, level: 'Seedling' },
  sprout: { min: 36, max: 48, level: 'Sprout' },
  growing: { min: 51, max: 63, level: 'Growing' },
  thriving: { min: 67, max: 78, level: 'Thriving' },
  model: { min: 81, max: 92, level: 'Model Village' },
};

function generatePolygonAroundPoint(lng, lat, radiusDelta = 0.012) {
  // Approximate octagonal polygon around center coordinate
  const points = [];
  const angles = [0, 45, 90, 135, 180, 225, 270, 315, 360];
  angles.forEach(deg => {
    const rad = (deg * Math.PI) / 180;
    // slight natural variation
    const r = radiusDelta * (0.85 + Math.sin(deg * 3) * 0.15);
    const pLng = Number((lng + (r * 1.2) * Math.cos(rad)).toFixed(6));
    const pLat = Number((lat + r * Math.sin(rad)).toFixed(6));
    points.push([pLng, pLat]);
  });
  return {
    type: 'Polygon',
    coordinates: [points],
  };
}

module.exports = {
  BLOCKS,
  DISTRICT,
  STATE,
  VILLAGE_DEFS,
  PROFILE_RANGES,
  generatePolygonAroundPoint,
};

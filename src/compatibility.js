// src/compatibility.js
const bloodCompatibility = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-']
};

function daysSince(dateStr){
  if(!dateStr) return Infinity;
  const then = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - then) / (1000*60*60*24));
}

function haversine(lat1, lon1, lat2, lon2){
  function toRad(x){ return x * Math.PI / 180; }
  const R = 6371;
  const dLat = toRad(lat2-lat1);
  const dLon = toRad(lon2-lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = { bloodCompatibility, daysSince, haversine };
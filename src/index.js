// src/index.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { bloodCompatibility, daysSince, haversine } = require('./compatibility');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 4000;

const hospitalsCsv = fs.readFileSync(path.join(__dirname, '..', 'data', 'hospitals_lebanon.csv'), 'utf8');
const hospitals = hospitalsCsv.split('\n').slice(1).filter(Boolean).map(line => {
  const [id, name, city, lat, lng] = line.split(',');
  return { id: id.trim(), name: name.trim(), city: city.trim(), lat: parseFloat(lat), lng: parseFloat(lng) };
});

// In-memory donors
let donors = [
  { id: 'd1', name: 'Ali', bloodType: 'O-', lastDonation: '2025-07-01', lat: 33.89871, lng: 35.48543, phone: '+96170000001' },
  { id: 'd2', name: 'Nadine', bloodType: 'A+', lastDonation: '2025-09-01', lat: 33.8870, lng: 35.4955, phone: '+96170000002' },
  { id: 'd3', name: 'Karim', bloodType: 'B+', lastDonation: '2025-10-15', lat: 34.4363, lng: 35.8493, phone: '+96170000003' }
];

const pendingPings = [];

app.get('/api/hospitals', (req, res) => {
  res.json(hospitals);
});

app.post('/api/requests', (req, res) => {
  const { hospital_id, recipient_blood_type, component, units, lat, lng } = req.body;
  const hospital = hospitals.find(h => h.id === String(hospital_id)) || hospitals[0];
  const requestLoc = { lat: lat || hospital.lat, lng: lng || hospital.lng };
  const allowed = bloodCompatibility[recipient_blood_type] || [];
  const radiusKm = 30;

  let eligible = donors.filter(d => {
    if (!allowed.includes(d.bloodType)) return false;
    if (daysSince(d.lastDonation) < 90) return false;
    const dist = haversine(requestLoc.lat, requestLoc.lng, d.lat, d.lng);
    if (dist > radiusKm) return false;
    return true;
  }).map(d => ({ ...d, dist: haversine(requestLoc.lat, requestLoc.lng, d.lat, d.lng) }))
    .sort((a,b) => a.dist - b.dist);

  let remaining = units || 1;
  const matched = [];
  const requestId = Date.now().toString();

  for (const d of eligible) {
    if (remaining <= 0) break;
    matched.push({ donorId: d.id, name: d.name, bloodType: d.bloodType, phone: d.phone, dist: Math.round(d.dist) });
    pendingPings.push({
      requestId,
      hospitalName: hospital.name,
      recipientBloodType: recipient_blood_type,
      units,
      createdAt: new Date().toISOString(),
      donorId: d.id
    });
    remaining -= 1;
  }

  res.json({ requestId, requested: units, matchedCount: matched.length, matched, remaining });
});

app.get('/api/donor/pings', (req, res) => {
  res.json(pendingPings);
});

app.post('/api/requests/:id/offer', (req, res) => {
  const { donorId } = req.body;
  const requestId = req.params.id;
  const ping = pendingPings.find(p => p.requestId === requestId && p.donorId === donorId);
  if (!ping) return res.status(404).json({ ok: false, message: 'Ping not found' });
  ping.accepted = true;
  ping.acceptedAt = new Date().toISOString();
  res.json({ ok: true, message: 'Accepted' });
});

app.listen(PORT, () => {
  console.log('BloodRide backend running on port', PORT);
});
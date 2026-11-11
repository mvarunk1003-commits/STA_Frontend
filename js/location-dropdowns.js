/**
 * location-dropdowns.js
 * 
 * Provides cascading State → District → Taluk dropdowns
 * for any form in the SSTPA Portal.
 * 
 * Usage:
 *   <script src="js/location-dropdowns.js"></script>
 *   initLocationDropdowns('sel-state', 'sel-district', 'sel-taluk');
 * 
 * Or for pre-filling from existing values:
 *   initLocationDropdowns('sel-state', 'sel-district', 'sel-taluk', 'Karnataka', 'Mysuru', 'Nanjangud');
 */

let _locationData = null;

async function loadLocationData() {
  if (_locationData) return _locationData;
  try {
    const res = await fetch('data/south_india_locations.json');
    if (!res.ok) throw new Error('Failed to load location data');
    _locationData = await res.json();
    return _locationData;
  } catch (e) {
    console.error('Location data load error:', e.message);
    return {};
  }
}

/**
 * Initialise cascading dropdowns.
 * @param {string} stateSelId    - ID of the State <select>
 * @param {string} districtSelId - ID of the District <select>
 * @param {string} talukSelId    - ID of the Taluk <select>
 * @param {string} preState      - Pre-selected state (optional)
 * @param {string} preDistrict   - Pre-selected district (optional)
 * @param {string} preTaluk      - Pre-selected taluk (optional)
 */
async function initLocationDropdowns(stateSelId, districtSelId, talukSelId, preState, preDistrict, preTaluk) {
  const data = await loadLocationData();
  const stateSel    = document.getElementById(stateSelId);
  const districtSel = document.getElementById(districtSelId);
  const talukSel    = document.getElementById(talukSelId);

  if (!stateSel || !districtSel || !talukSel) return;

  const states = Object.keys(data).sort();

  // Populate States
  stateSel.innerHTML = '<option value="">— Select State —</option>' +
    states.map(s => `<option value="${s}"${s === preState ? ' selected' : ''}>${s}</option>`).join('');

  function populateDistricts(selectedState, selectedDistrict) {
    districtSel.innerHTML = '<option value="">— Select District —</option>';
    talukSel.innerHTML = '<option value="">— Select Taluk —</option>';
    if (!selectedState || !data[selectedState]) return;

    const districts = Object.keys(data[selectedState]).sort();
    districtSel.innerHTML = '<option value="">— Select District —</option>' +
      districts.map(d => `<option value="${d}"${d === selectedDistrict ? ' selected' : ''}>${d}</option>`).join('');

    if (selectedDistrict) {
      populateTaluks(selectedState, selectedDistrict);
    }
  }

  function populateTaluks(selectedState, selectedDistrict, selectedTaluk) {
    talukSel.innerHTML = '<option value="">— Select Taluk —</option>';
    if (!selectedState || !selectedDistrict) return;
    const taluks = (data[selectedState] && data[selectedState][selectedDistrict]) || [];
    talukSel.innerHTML = '<option value="">— Select Taluk —</option>' +
      taluks.map(t => `<option value="${t}"${t === (selectedTaluk || preTaluk) ? ' selected' : ''}>${t}</option>`).join('');
  }

  // Wire events
  stateSel.addEventListener('change', () => {
    populateDistricts(stateSel.value, '');
  });

  districtSel.addEventListener('change', () => {
    populateTaluks(stateSel.value, districtSel.value, '');
  });

  // Pre-fill
  if (preState) {
    populateDistricts(preState, preDistrict || '');
    if (preDistrict && preTaluk) {
      populateTaluks(preState, preDistrict, preTaluk);
    }
  }
}

/**
 * Helper: reset all 3 dropdowns to placeholder state
 */
function resetLocationDropdowns(stateSelId, districtSelId, talukSelId) {
  const stateSel    = document.getElementById(stateSelId);
  const districtSel = document.getElementById(districtSelId);
  const talukSel    = document.getElementById(talukSelId);
  if (stateSel)    stateSel.innerHTML    = '<option value="">— Select State —</option>';
  if (districtSel) districtSel.innerHTML = '<option value="">— Select District —</option>';
  if (talukSel)    talukSel.innerHTML    = '<option value="">— Select Taluk —</option>';
  // Re-init states only
  loadLocationData().then(data => {
    if (!data || !stateSel) return;
    const states = Object.keys(data).sort();
    stateSel.innerHTML = '<option value="">— Select State —</option>' +
      states.map(s => `<option value="${s}">${s}</option>`).join('');
  });
}

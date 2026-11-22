// Runs before first paint: restore the saved day/dark choice (else follow the device).
try {
  var t = localStorage.getItem('raffix-theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
document.documentElement.dataset.chain = 'eth';

/* SpoolFilm appearance: light, dark, or follow the operating system. */
(function () {
  'use strict';
  var KEY = 'spoolfilm-theme';
  var preference = 'system';
  try { preference = localStorage.getItem(KEY) || 'system'; } catch (e) {}
  if (['light', 'dark', 'system'].indexOf(preference) < 0) preference = 'system';
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function resolvedTheme() {
    return preference === 'system' ? (media && media.matches ? 'dark' : 'light') : preference;
  }
  function apply() {
    var theme = resolvedTheme();
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme-preference', preference);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#211d2b' : '#fff5f7');
    document.querySelectorAll('[data-theme-choice]').forEach(function (button) {
      var active = button.getAttribute('data-theme-choice') === preference;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }
  function set(next) {
    if (['light', 'dark', 'system'].indexOf(next) < 0) return;
    preference = next;
    try { localStorage.setItem(KEY, preference); } catch (e) {}
    apply();
  }
  if (media) {
    if (media.addEventListener) media.addEventListener('change', function () { if (preference === 'system') apply(); });
    else if (media.addListener) media.addListener(function () { if (preference === 'system') apply(); });
  }
  window.SpoolTheme = { set: set, apply: apply, get preference() { return preference; } };
  apply();
  document.addEventListener('DOMContentLoaded', apply);
})();

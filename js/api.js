/* E-Bendahara — komunikasi ke Google Apps Script (REST via fetch) */
(function () {
  'use strict';

  const KUNCI_SESI = 'eb_sesi';

  function sesi() { return UI.bacaLokal(KUNCI_SESI); }
  function setSesi(s) { if (s) UI.simpanLokal(KUNCI_SESI, s); else UI.hapusLokal(KUNCI_SESI); }

  function urlValid() {
    const u = (window.EB_CONFIG && window.EB_CONFIG.GAS_URL) || '';
    return /^https?:\/\/.+\/exec$/.test(u) && u.indexOf('GANTI_DENGAN') < 0;
  }

  /**
   * Kirim perintah ke server. Selalu POST text/plain (tanpa CORS preflight).
   * Mengembalikan objek JSON server; melempar Error berisi pesan yang ramah.
   */
  async function panggil(action, data, opsi) {
    opsi = opsi || {};
    const s = sesi();
    const ctrl = new AbortController();
    const timer = setTimeout(function () { ctrl.abort(); }, opsi.batasWaktu || 45000);
    let res;
    try {
      res = await fetch(window.EB_CONFIG.GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, token: s ? s.token : '', data: data || {} }),
        redirect: 'follow',
        signal: ctrl.signal
      });
    } catch (e) {
      throw buatError(e.name === 'AbortError'
        ? 'Server terlalu lama menjawab. Periksa sinyal lalu coba lagi.'
        : 'Tidak dapat terhubung. Periksa koneksi internet.', 'JARINGAN');
    } finally {
      clearTimeout(timer);
    }
    let json;
    try { json = await res.json(); }
    catch (e) { throw buatError('Jawaban server tidak terbaca (' + res.status + '). Pastikan URL /exec benar dan sudah di-deploy ulang.', 'SERVER'); }
    if (!json.success) {
      if (json.code === 'SESI' && !opsi.tanpaKeluar) {
        setSesi(null);
        if (window.EB && EB.keLogin) EB.keLogin(json.message);
      }
      throw buatError(json.message || 'Terjadi kesalahan.', json.code);
    }
    return json;
  }

  function buatError(pesan, kode) { const e = new Error(pesan); e.kode = kode; return e; }

  window.API = { panggil: panggil, sesi: sesi, setSesi: setSesi, urlValid: urlValid };
})();

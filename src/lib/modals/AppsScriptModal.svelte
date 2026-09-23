<script>
    import { isAppsScriptModalOpen, showToast } from '../stores/uiStore.js';

    const scriptCode = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Inisialisasi Header bila masih kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["ID", "Tanggal", "Keterangan", "Nominal", "Tipe", "Sumber", "Kategori", "User ID", "User Name"]);
    }
    
    if (action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Terkoneksi!" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "sync") {
      var rows = sheet.getDataRange().getValues();
      var result = [];
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        if (r[0] && r[1]) {
          result.push({
            id: String(r[0]),
            date: String(r[1]),
            desc: String(r[2]),
            amount: Number(r[3]),
            type: String(r[4]),
            source: String(r[5] || 'pribadi'),
            category: String(r[6] || 'makan'),
            userId: String(r[7] || ''),
            userName: String(r[8] || '')
          });
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "add") {
      sheet.appendRow([data.id, data.date, data.desc, data.amount, data.type, data.source, data.category, data.userId, data.userName]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "delete") {
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

    function copyCode() {
        navigator.clipboard.writeText(scriptCode).then(() => {
            showToast('Kode Google Apps Script berhasil disalin ke clipboard!', 'success', '📋');
        });
    }
</script>

{#if $isAppsScriptModalOpen}
    <div class="modal-overlay active" on:click={() => isAppsScriptModalOpen.set(false)}>
        <div class="modal-box" style="text-align: left; max-width: 460px;" on:click|stopPropagation>
            <div style="font-size:32px; margin-bottom:8px;">📜</div>
            <h3>Kode Google Apps Script</h3>
            <p style="font-size:12.5px; color:var(--text-gray); margin-bottom:12px;">
                Salin kode di bawah ke menu <b>Extensions &gt; Apps Script</b> di Google Sheets Anda, lalu Deploy sebagai Web App (Who has access: <b>Anyone</b>).
            </p>
            <div style="position:relative; text-align:left;">
                <textarea
                    readonly
                    style="width:100%; height:200px; font-family:monospace; font-size:11px; padding:10px; background:var(--input-bg); border:1px solid var(--border-color); border-radius:12px; resize:none;"
                >{scriptCode}</textarea>
                <button
                    type="button"
                    on:click={copyCode}
                    class="btn-primary"
                    style="margin-top:8px; width:100%; border-radius:12px; padding:10px; font-size:13px;"
                >
                    📋 Salin Semua Kode
                </button>
            </div>
            <button
                type="button"
                on:click={() => isAppsScriptModalOpen.set(false)}
                class="btn-danger"
                style="margin-top:10px; width:100%; border-radius:12px; padding:10px; font-size:12px;"
            >
                Tutup
            </button>
        </div>
    </div>
{/if}

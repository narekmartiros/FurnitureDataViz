import { NextRequest, NextResponse } from 'next/server';
import { deduceModelFromSheetRows, parseDelimitedSheetText } from '@furniture-dataviz/parametric-engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sheetUrl, rawText } = body as { sheetUrl?: string; rawText?: string };

    // 1. If raw pasted TSV/CSV cells were provided, parse and deduce directly
    if (rawText && rawText.trim().length > 0) {
      const rows = parseDelimitedSheetText(rawText);
      const deduced = deduceModelFromSheetRows(rows);
      return NextResponse.json({
        ok: true,
        source: 'clipboard',
        rowCount: rows.length,
        deduced
      });
    }

    if (!sheetUrl) {
      return NextResponse.json({ ok: false, error: 'Missing sheetUrl or rawText' }, { status: 400 });
    }

    // Extract spreadsheetId and gid from Google Sheets URL
    const idMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = sheetUrl.match(/[?#&]gid=([0-9]+)/);
    const spreadsheetId = idMatch ? idMatch[1] : sheetUrl.trim();
    const gid = gidMatch ? gidMatch[1] : null;

    // Candidate public/shared CSV export URLs
    const candidateUrls = [
      gid
        ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
        : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Sheet20`,
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Sheet20`,
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`
    ];

    for (const url of candidateUrls) {
      const resp = await fetch(url, {
        headers: { Accept: 'text/csv,text/plain,*/*' },
        cache: 'no-store',
        redirect: 'follow'
      });

      const contentType = resp.headers.get('content-type') || '';
      const text = await resp.text();

      // Check if Google returned an HTML sign-in / permission page instead of CSV
      if (
        resp.ok &&
        !contentType.includes('text/html') &&
        !text.trim().startsWith('<!DOCTYPE') &&
        !text.trim().startsWith('<html') &&
        !text.includes('ServiceLogin')
      ) {
        const rows = parseDelimitedSheetText(text);
        if (rows.length > 0) {
          const deduced = deduceModelFromSheetRows(rows);
          return NextResponse.json({
            ok: true,
            source: 'google-sheets-live',
            spreadsheetId,
            gid,
            rowCount: rows.length,
            deduced
          });
        }
      }
    }

    return NextResponse.json(
      {
        ok: false,
        requiresSharingOrPaste: true,
        spreadsheetId,
        gid,
        error:
          'Google Sheet is restricted. Set Share -> "Anyone with the link can view" in Google Sheets for live URL sync, or paste your sheet cells (Ctrl+V) directly.'
      },
      { status: 403 }
    );
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Failed to sync sheet' },
      { status: 500 }
    );
  }
}

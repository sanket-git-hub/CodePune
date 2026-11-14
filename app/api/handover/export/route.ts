import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { clearanceFor } from "@/lib/permissions";

// Simple text wrapper for standard PDF fonts
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.replace(/\r?\n/g, " ").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  return lines;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Check session & role
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectIdParam = searchParams.get("project_id");

    // 2. Resolve project & verify handover status = 'approved'
    const handoverQuery = await pool.query(
      `SELECT h.id, h.project_id, h.status, h.approved_at,
              p.name AS project_name,
              u_leaver.name AS leaver_name,
              u_incoming.name AS incoming_name,
              u_approved.name AS approved_by_name
       FROM handovers h
       JOIN projects p ON p.id = h.project_id
       LEFT JOIN users u_leaver ON u_leaver.id = h.leaver_id
       LEFT JOIN users u_incoming ON u_incoming.id = h.incoming_id
       LEFT JOIN users u_approved ON u_approved.id = h.approved_by
       WHERE ($1::bigint IS NULL OR h.project_id = $1::bigint)
       ORDER BY h.id DESC
       LIMIT 1`,
      [projectIdParam ?? null]
    );

    const handover = handoverQuery.rows[0];
    if (!handover) {
      return NextResponse.json({ error: "No handover packet found" }, { status: 404 });
    }

    if (handover.status !== "approved") {
      return NextResponse.json(
        { error: "Handover is not yet approved. PDF export is only available for approved handovers." },
        { status: 403 }
      );
    }

    // 3. Re-check clearance AT EXPORT TIME
    const clearance = clearanceFor(user.role);

    // Fetch approved claims the user has clearance to see
    const { rows: claims } = await pool.query(
      `SELECT id::text, type, statement, excerpt, access_tag, evidence_status
       FROM claims
       WHERE project_id = $1::bigint
         AND review_state = 'approved'
         AND access_tag = ANY($2::text[])
       ORDER BY type ASC, id ASC`,
      [handover.project_id, clearance]
    );

    // Count hidden claims
    const { rows: hiddenCountRows } = await pool.query(
      `SELECT count(*)::int AS count
       FROM claims
       WHERE project_id = $1::bigint
         AND review_state = 'approved'
         AND NOT (access_tag = ANY($2::text[]))`,
      [handover.project_id, clearance]
    );

    const hiddenCount = hiddenCountRows[0]?.count || 0;

    // 4. Generate pure-JS PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

    const pageWidth = 595.28; // A4 standard pt
    const pageHeight = 841.89;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;
    const maxChars = 75;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    function checkAddPage(neededHeight: number) {
      if (y - neededHeight < margin + 40) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    }

    // Title & Header
    page.drawText("ByeByeBrain — Handover Packet", {
      x: margin,
      y,
      size: 20,
      font: fontBold,
      color: rgb(0.05, 0.05, 0.15),
    });
    y -= 25;

    page.drawText(`Project: ${handover.project_name || "Campus Pay"}`, {
      x: margin,
      y,
      size: 13,
      font: fontBold,
      color: rgb(0.35, 0.35, 0.5),
    });
    y -= 18;

    const fromToText = `From: ${handover.leaver_name || "Riya"}  -->  To: ${handover.incoming_name || "Arjun"}`;
    page.drawText(fromToText, {
      x: margin,
      y,
      size: 11,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= 16;

    const approvalText = `Status: Approved ${handover.approved_at ? `on ${new Date(handover.approved_at).toLocaleDateString()}` : ""} ${handover.approved_by_name ? `by ${handover.approved_by_name}` : ""}`;
    page.drawText(approvalText, {
      x: margin,
      y,
      size: 10,
      font: fontOblique,
      color: rgb(0.2, 0.6, 0.3),
    });
    y -= 25;

    // Divider
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });
    y -= 20;

    // Group claims by type
    const grouped = claims.reduce((acc: Record<string, typeof claims>, claim) => {
      acc[claim.type] = acc[claim.type] || [];
      acc[claim.type].push(claim);
      return acc;
    }, {});

    const types = Object.keys(grouped);

    if (types.length === 0) {
      page.drawText("No approved claims available for this handover under your clearance level.", {
        x: margin,
        y,
        size: 11,
        font: fontOblique,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 25;
    } else {
      for (const type of types) {
        checkAddPage(40);

        // Section Type Header
        const typeHeader = `${type.toUpperCase()}S (${grouped[type].length})`;
        page.drawText(typeHeader, {
          x: margin,
          y,
          size: 12,
          font: fontBold,
          color: rgb(0.25, 0.25, 0.6),
        });
        y -= 16;

        for (const claim of grouped[type]) {
          const statementLines = wrapText(claim.statement, maxChars);
          const excerptLines = wrapText(`Source excerpt: "${claim.excerpt}"`, maxChars);
          const claimBlockHeight = (statementLines.length + excerptLines.length) * 14 + 20;

          checkAddPage(claimBlockHeight);

          // Status and statement
          const badgeText = `[${claim.evidence_status.toUpperCase()}]`;
          page.drawText(badgeText, {
            x: margin,
            y,
            size: 9,
            font: fontBold,
            color: claim.evidence_status === "verified" ? rgb(0.1, 0.6, 0.2) : rgb(0.4, 0.4, 0.8),
          });

          let textX = margin + 65;
          let firstLine = true;
          for (const line of statementLines) {
            page.drawText(line, {
              x: firstLine ? textX : margin + 15,
              y,
              size: 10,
              font: font,
              color: rgb(0.1, 0.1, 0.1),
            });
            y -= 13;
            firstLine = false;
          }

          // Excerpt
          for (const exLine of excerptLines) {
            page.drawText(exLine, {
              x: margin + 15,
              y,
              size: 9,
              font: fontOblique,
              color: rgb(0.45, 0.45, 0.45),
            });
            y -= 12;
          }

          y -= 8; // Spacing between items
        }

        y -= 12; // Spacing between groups
      }
    }

    // Final clearance note
    checkAddPage(30);
    const hiddenLine = `${hiddenCount} item${hiddenCount === 1 ? "" : "s"} hidden because you do not have access.`;
    page.drawText(hiddenLine, {
      x: margin,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.5, 0.4, 0.1),
    });

    // Page numbering on all pages
    const totalPages = pdfDoc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const p = pdfDoc.getPage(i);
      p.drawText(`Page ${i + 1} of ${totalPages}`, {
        x: pageWidth / 2 - 25,
        y: 25,
        size: 9,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    const pdfBytes = await pdfDoc.save();

    // 5. Write audit_log
    await writeAudit({
      userId: user.id,
      action: "handover.export_pdf",
      entity: "handover",
      entityId: handover.id,
      detail: {
        project_id: handover.project_id,
        claims_exported: claims.length,
        claims_hidden: hiddenCount,
        clearance,
      },
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="handover-${handover.project_name || "campus-pay"}.pdf"`,
      },
    });
  } catch (err: unknown) {
    console.error("PDF export error:", err);
    return NextResponse.json({ error: "Failed to generate handover PDF" }, { status: 500 });
  }
}

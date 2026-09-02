import { jsPDF } from 'jspdf';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import { saveAs } from 'file-saver';
import { ContratoData, DocumentoConfig } from '../types';

export function exportarPDF(contrato: ContratoData, config?: DocumentoConfig): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const marginTop = config?.margensMm?.topo || 20;
  const marginBottom = config?.margensMm?.baixo || 20;
  const marginLeft = config?.margensMm?.esquerda || 20;
  const marginRight = config?.margensMm?.direita || 20;

  const pageWidth = 210;
  const pageHeight = 297;
  const printableWidth = pageWidth - marginLeft - marginRight;
  const startY = marginTop + (config?.exibirCabecalho ? 10 : 0);

  let currentY = startY;

  // Header
  if (config?.exibirCabecalho && config.cabecalhoTexto) {
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(config.cabecalhoTexto, pageWidth / 2, marginTop - 5, { align: 'center' });
    doc.setDrawColor(200);
    doc.line(marginLeft, marginTop - 2, pageWidth - marginRight, marginTop - 2);
  }

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);

  const titleLines = doc.splitTextToSize(contrato.titulo.toUpperCase(), printableWidth);
  doc.text(titleLines, pageWidth / 2, currentY, { align: 'center' });
  currentY += titleLines.length * 7 + 6;

  // Document Content
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(config?.tamanhoFonte || 11);
  doc.setTextColor(30, 30, 30);

  const contentText = contrato.conteudoFinal || '';
  const paragraphs = contentText.split('\n');

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    if (!p) {
      currentY += 4;
      continue;
    }

    // Check if line looks like a Clause Title
    const isHeading = p.startsWith('CLÁUSULA') || p.startsWith('CONTRATO') || p.startsWith('IDENTIFICAÇÃO') || p === p.toUpperCase() && p.length < 60;

    if (isHeading) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      currentY += 2;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(config?.tamanhoFonte || 10.5);
    }

    const lines = doc.splitTextToSize(p, printableWidth);

    // Check page space
    if (currentY + lines.length * 5 > pageHeight - marginBottom - 15) {
      doc.addPage();
      currentY = startY;

      if (config?.exibirCabecalho && config.cabecalhoTexto) {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(config.cabecalhoTexto, pageWidth / 2, marginTop - 5, { align: 'center' });
        doc.setDrawColor(200);
        doc.line(marginLeft, marginTop - 2, pageWidth - marginRight, marginTop - 2);
      }
    }

    doc.text(lines, marginLeft, currentY, {
      align: config?.alinhamento === 'esquerda' ? 'left' : 'left'
    });

    currentY += lines.length * 5.2 + (isHeading ? 3 : 2);
  }

  // Page Numbers Footer
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(120);
    if (config?.exibirRodape && config.rodapeTexto) {
      doc.text(config.rodapeTexto, marginLeft, pageHeight - marginBottom + 8);
    }
    if (config?.paginacao !== false) {
      doc.text(`Página ${page} de ${totalPages}`, pageWidth - marginRight, pageHeight - marginBottom + 8, { align: 'right' });
    }
  }

  const safeFilename = `Contrato_${contrato.numero.replace('/', '-')}.pdf`;
  doc.save(safeFilename);
}

export async function exportarDOCX(contrato: ContratoData, config?: DocumentoConfig): Promise<void> {
  const contentText = contrato.conteudoFinal || '';
  const lines = contentText.split('\n');

  const childrenParagraphs: Paragraph[] = [];

  // Title
  childrenParagraphs.push(
    new Paragraph({
      text: contrato.titulo.toUpperCase(),
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 }
    })
  );

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      childrenParagraphs.push(new Paragraph({ text: '' }));
      continue;
    }

    const isHeading = trimmed.startsWith('CLÁUSULA') || trimmed.startsWith('CONTRATO') || trimmed.startsWith('IDENTIFICAÇÃO');

    if (isHeading) {
      childrenParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              size: 24, // 12pt
              font: config?.fonte || 'Arial'
            })
          ],
          spacing: { before: 200, after: 100 }
        })
      );
    } else {
      childrenParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmed,
              size: 22, // 11pt
              font: config?.fonte || 'Arial'
            })
          ],
          alignment: config?.alinhamento === 'esquerda' ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
          spacing: { after: 120 }
        })
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: (config?.margensMm?.topo || 20) * 56.7,
              bottom: (config?.margensMm?.baixo || 20) * 56.7,
              left: (config?.margensMm?.esquerda || 20) * 56.7,
              right: (config?.margensMm?.direita || 20) * 56.7
            }
          }
        },
        children: childrenParagraphs
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const safeFilename = `Contrato_${contrato.numero.replace('/', '-')}.docx`;
  saveAs(blob, safeFilename);
}

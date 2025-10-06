// utils/pdfExport.ts
import { jsPDF } from 'jspdf';

interface Winner {
  id: string;
  name: string;
  wonAt: Date;
  prizeId?: string;
  prizeName?: string;
  drawSession?: string;
  email?: string;
}

interface ExportOptions {
  title?: string;
  subtitle?: string;
  winners: Winner[];
}

// Lightweight PDF export without html2canvas
export const exportWinnersPDF = async ({ title = 'Daftar Pemenang', subtitle, winners }: ExportOptions) => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageHeight = pdf.internal.pageSize.height;
    const pageWidth = pdf.internal.pageSize.width;
    const margin = 20;
    let yPosition = margin;

    // Helper function to add new page if needed
    const checkPageBreak = (requiredHeight: number) => {
      if (yPosition + requiredHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
    };

    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    if (subtitle) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(subtitle, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
    }

    // Date generated
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleString('id-ID')}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Table header
    checkPageBreak(20);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    
    const colWidths = [15, 50, 40, 35, 30];
    const headers = ['No', 'Name', 'Prize', 'Date', 'Time'];
    let xPosition = margin;

    // Draw header background
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 8, 'F');

    headers.forEach((header, index) => {
      pdf.text(header, xPosition + 2, yPosition, { maxWidth: colWidths[index] - 4 });
      xPosition += colWidths[index];
    });
    yPosition += 10;

    // Table content
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    winners.forEach((winner, index) => {
      checkPageBreak(8);
      
      xPosition = margin;
      const rowData = [
        (index + 1).toString(),
        winner.name,
        winner.prizeName || '-',
        new Date(winner.wonAt).toLocaleDateString('id-ID'),
        new Date(winner.wonAt).toLocaleTimeString('id-ID', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      ];

      // Alternate row background
      if (index % 2 === 0) {
        pdf.setFillColor(248, 248, 248);
        pdf.rect(margin, yPosition - 3, pageWidth - 2 * margin, 6, 'F');
      }

      rowData.forEach((data, colIndex) => {
        pdf.text(data, xPosition + 2, yPosition, { maxWidth: colWidths[colIndex] - 4 });
        xPosition += colWidths[colIndex];
      });
      
      yPosition += 6;
    });

    // Footer
    const totalPages = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      pdf.text(`Total Winners: ${winners.length}`, margin, pageHeight - 10);
    }

    // Save file
    const fileName = `winners-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    return { success: true, fileName };
  } catch (error) {
    console.error('PDF Export Error:', error);
    return { success: false, error: error.message };
  }
};

// Alternative: Simple text-based export
export const exportWinnersSimplePDF = async (winners: Winner[]) => {
  try {
    const pdf = new jsPDF();
    let yPosition = 20;
    const lineHeight = 7;
    
    pdf.setFontSize(16);
    pdf.text('Daftar Pemenang', 20, yPosition);
    yPosition += 15;
    
    pdf.setFontSize(10);
    pdf.text(`Generated: ${new Date().toLocaleString('id-ID')}`, 20, yPosition);
    yPosition += 15;
    
    winners.forEach((winner, index) => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }
      
      const text = `${index + 1}. ${winner.name} - ${winner.prizeName || 'No Prize'} - ${new Date(winner.wonAt).toLocaleString('id-ID')}`;
      pdf.text(text, 20, yPosition);
      yPosition += lineHeight;
    });
    
    pdf.save(`winners-simple-${Date.now()}.pdf`);
    return { success: true };
  } catch (error) {
    console.error('Simple PDF Export Error:', error);
    return { success: false, error: error.message };
  }
};

// Extract BIB number from name string
const extractBIB = (name: string): string => {
  const bibMatch = name.match(/\((\d+)\)$/);
  return bibMatch ? bibMatch[1] : '';
};

// Extract name without BIB
const extractName = (fullName: string): string => {
  return fullName.replace(/\s*\(\d+\)$/, '').trim();
};

// CSV Export with Phone and Email
export const exportWinnersCSV = (winners: Winner[]) => {
  try {
    const headers = ['No', 'Name', 'BIB', 'Email', 'Prize', 'Date', 'Time'];
    const csvContent = [
      headers.join(','),
      ...winners.map((winner, index) => {
        const cleanName = extractName(winner.name);
        const bibNumber = extractBIB(winner.name);
        
        return [
          index + 1,
          `"${cleanName}"`,
          `"${bibNumber}"`,
          `"${winner.email || '-'}"`,
          `"${winner.prizeName || '-'}"`,
          new Date(winner.wonAt).toLocaleDateString('id-ID'),
          new Date(winner.wonAt).toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
          })
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `winners-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    return { success: true };
  } catch (error) {
    console.error('CSV Export Error:', error);
    return { success: false, error: (error as Error).message };
  }
};
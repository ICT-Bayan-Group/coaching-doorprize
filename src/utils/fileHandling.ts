import Papa from 'papaparse';
import { Participant } from '../types';

// Interface untuk data yang diimport dengan informasi tambahan
interface ImportedParticipantData {
  name: string;
  email?: string;
}

function maskEmail(email: string): string {
  if (!email) return "";

  const [localPart, domain] = email.split("@");
  if (!domain) return email; // kalau tidak valid

  if (localPart.length <= 4) {
    // kalau pendek banget biarin saja
    return email;
  }

  const firstTwo = localPart.slice(0, 2);
  const lastTwo = localPart.slice(-2);
  const masked = "*".repeat(localPart.length - 4);

  return `${firstTwo}${masked}${lastTwo}@${domain}`;
}

// Update return type untuk include phone dan email
export const importFromFile = (file: File): Promise<ImportedParticipantData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        
        if (file.name.endsWith('.csv')) {
          Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false,
            complete: (results) => {
              try {
                const data = results.data as any[];
                const participants: ImportedParticipantData[] = [];
                
                if (data.length > 0) {
                  // Get the headers/column names and trim whitespace
                  const headers = Object.keys(data[0]).map(h => h.trim());
                  
                  // Find name column (case insensitive)
                  const nameColumn = headers.find(header => 
                    header.toLowerCase().includes('nama') || 
                    header.toLowerCase().includes('name')
                  );
                  
                  // Find BIB column (case insensitive)
                  const bibColumn = headers.find(header => 
                    header.toLowerCase().includes('bib') || 
                    header.toLowerCase().includes('nomor') ||
                    header.toLowerCase().includes('number')
                  );
                  
                  
                  // Find email column (case insensitive)
                  const emailColumn = headers.find(header => 
                    header.toLowerCase().includes('email') || 
                    header.toLowerCase().includes('e-mail') ||
                    header.toLowerCase().includes('mail')
                  );
                  
                  data.forEach(row => {
                    let participantName = '';
                    let bibNumber = '';
                    let email = '';
                    
                    // Get name
                    if (nameColumn) {
                      const nameValue = String(row[nameColumn] || '').trim();
                      if (nameValue.length > 0) {
                        participantName = nameValue;
                      }
                    }
                    
                    // Get BIB
                    if (bibColumn) {
                      const bibValue = String(row[bibColumn] || '').trim();
                      if (bibValue.length > 0) {
                        // Format BIB number if it's numeric
                        if (/^\d+$/.test(bibValue)) {
                          bibNumber = bibValue.padStart(4, '0');
                        } else {
                          bibNumber = bibValue;
                        }
                      }
                    }
                    
                    // Get email
                    if (emailColumn) {
                      const emailValue = String(row[emailColumn] || '').trim();
                      if (emailValue.length > 0) {
                        email = emailValue;
                      }
                    }
                    
                    if (participantName || email) {
                      // 👉 Gunakan email masked untuk displayName
                      const maskedEmail = email ? maskEmail(email) : null;

                      const displayName = participantName && maskedEmail 
                        ? `${participantName} (${maskedEmail})`
                        : participantName || maskedEmail || '';

                      participants.push({
                        name: displayName,
                        email: email || undefined // tetap simpan full email
                      });
                    }
                  });
                  
                  // If no name or BIB columns found, try first column as fallback
                  if (participants.length === 0 && headers.length > 0) {
                    const firstColumn = headers[0];
                    data.forEach(row => {
                      const value = String(row[firstColumn] || '').trim();
                      if (value.length > 0) {
                        // Check if it's a number (treat as BIB)
                        if (/^\d+$/.test(value)) {
                          participants.push({
                            name: value.padStart(4, '0')
                          });
                        } else {
                          participants.push({
                            name: value
                          });
                        }
                      }
                    });
                  }
                }
                
                if (participants.length === 0) {
                  reject(new Error('Tidak ditemukan data yang valid dalam file CSV. Pastikan file memiliki kolom "nama"/"name" atau "bib"/"nomor".'));
                } else {
                  // Remove duplicates based on name
                  const seen = new Set<string>();
                  const uniqueParticipants = participants.filter(p => {
                    const key = p.name.toLowerCase();
                    if (seen.has(key)) {
                      return false;
                    }
                    seen.add(key);
                    return true;
                  });
                  resolve(uniqueParticipants);
                }
              } catch (error) {
                reject(new Error('Error parsing CSV data: ' + (error as Error).message));
              }
            },
            error: (error: { message: string; }) => {
              reject(new Error('CSV parsing error: ' + error.message));
            }
          });
        } else {
          // Handle .txt files - assume each line is a name or BIB
          const lines = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
          
          const participants: ImportedParticipantData[] = [];
          
          lines.forEach(line => {
            // Check if line is purely numeric (treat as BIB)
            if (/^\d+$/.test(line)) {
              participants.push({
                name: `BIB ${line.padStart(4, '0')}`
              });
            } else {
              participants.push({
                name: line
              });
            }
          });
            
          if (participants.length === 0) {
            reject(new Error('Tidak ditemukan data yang valid dalam file teks.'));
          } else {
            // Remove duplicates
            const seen = new Set<string>();
            const uniqueParticipants = participants.filter(p => {
              const key = p.name.toLowerCase();
              if (seen.has(key)) {
                return false;
              }
              seen.add(key);
              return true;
            });
            resolve(uniqueParticipants);
          }
        }
      } catch (error) {
        reject(new Error('Gagal memproses file: ' + (error as Error).message));
      }
    };
    
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsText(file, 'UTF-8');
  });
};

// Helper function to extract BIB from name string
const extractBIB = (name: string): string => {
  const bibMatch = name.match(/\((\d+)\)$/);
  return bibMatch ? bibMatch[1] : '';
};

// Helper function to extract name without BIB
const extractName = (fullName: string): string => {
  return fullName.replace(/\s*\(\d+\)$/, '').trim();
};

// Export to CSV with phone and email support
export const exportToCsv = (participants: Participant[], winners: any[]) => {
  const csvContent = [
    ['Winner Name', 'BIB', 'Email', 'Prize Name', 'Draw Time'],
    ...winners.map(w => {
      const cleanName = extractName(w.name);
      const bibNumber = extractBIB(w.name);
      return [
        cleanName,
        bibNumber,
        w.email || '-',
        w.prizeName || 'No Prize',
        new Date(w.wonAt).toLocaleString('id-ID')
      ];
    }),
    [''],
    ['Remaining Participants', 'BIB', 'Email', '', 'Added At'],
    ...participants.map(p => {
      const cleanName = extractName(p.name);
      const bibNumber = extractBIB(p.name);
      return [
        cleanName,
        bibNumber,
        (p as any).email || '-',
        '',
        new Date(p.addedAt).toLocaleString('id-ID')
      ];
    })
  ];

  const csv = Papa.unparse(csvContent);
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bayan-run-2025-doorprize-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
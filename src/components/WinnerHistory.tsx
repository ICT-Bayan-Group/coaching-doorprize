import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Printer, FileSpreadsheet, Loader2 } from 'lucide-react';
import { exportWinnersCSV } from '../utils/pdfExport';

interface Winner {
  id: string;
  name: string;
  wonAt: Date;
  prizeId?: string;
  prizeName?: string;
  drawSession?: string;
  email?: string;
}

interface WinnerHistoryProps {
  winners: Winner[];
}

const WinnerHistory: React.FC<WinnerHistoryProps> = ({ winners }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'csv' | null>(null);

  // Group winners by draw session or prize
  const groupedWinners = React.useMemo(() => {
    return winners.reduce((acc, winner) => {
      const key = winner.drawSession || new Date(winner.wonAt).toISOString().split('T')[0];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(winner);
      return acc;
    }, {} as Record<string, Winner[]>);
  }, [winners]);

  const winnersWithSessions = React.useMemo(() => {
    return Object.entries(groupedWinners).filter(([key, sessionWinners]) => 
      sessionWinners[0].drawSession
    );
  }, [groupedWinners]);

  const singleWinners = React.useMemo(() => {
    return winners.filter(w => !w.drawSession);
  }, [winners]);

  const handleExport = async (type: 'csv') => {
    if (isExporting) return;
    
    setIsExporting(true);
    setExportType(type);

    try {
      const result = exportWinnersCSV(winners);

      if (result.success) {
        console.log(`Export ${type} berhasil`);
      } else {
        console.error(`Export ${type} gagal:`, result.error);
        alert(`Export gagal: ${result.error}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Terjadi kesalahan saat export');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Daftar Pemenang</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .winner-item { 
              display: flex; 
              justify-content: space-between; 
              padding: 10px; 
              border-bottom: 1px solid #eee; 
            }
            .winner-item:nth-child(even) { background-color: #f9f9f9; }
            .winner-number { font-weight: bold; color: #f59e0b; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Daftar Pemenang Undian</h1>
            <p>Total: ${winners.length} pemenang</p>
            <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
          </div>
          ${winners.map((winner, index) => `
            <div class="winner-item">
              <div>
                <span class="winner-number">${index + 1}.</span>
                <strong>${winner.name}</strong>
                ${winner.prizeName ? `<br><small>🏆 ${winner.prizeName}</small>` : ''}
              </div>
              <div>
                ${new Date(winner.wonAt).toLocaleString('id-ID')}
              </div>
            </div>
          `).join('')}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Pemenang ({winners.length})
        </h2>
        
        {winners.length > 0 && (
          <div className="flex gap-2">
            {/* CSV Export */}
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export ke CSV"
            >
              {isExporting && exportType === 'csv' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              CSV
            </button>

            {/* Print */}
            <button
              onClick={handlePrint}
              disabled={isExporting}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Print"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence>
          {/* Winners with draw sessions */}
          {winnersWithSessions.map(([sessionKey, sessionWinners], sessionIndex) => (
            <div key={sessionKey} className="mb-6">
              {sessionWinners[0].prizeName && (
                <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <h3 className="font-semibold text-purple-800 flex items-center gap-2">
                    🏆 {sessionWinners[0].prizeName}
                  </h3>
                  <p className="text-sm text-purple-600">
                    {sessionWinners.length} pemenang
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-2">
                {sessionWinners.map((winner, index) => (
                  <motion.div
                    key={`${winner.id}-${sessionIndex}-${index}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ delay: (sessionIndex * sessionWinners.length + index) * 0.05 }}
                    className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-400 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{winner.name}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(winner.wonAt).toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                    <Trophy className="w-5 h-5 text-yellow-500" />
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Single winners */}
          {singleWinners.map((winner, index) => (
            <motion.div
              key={`single-${winner.id}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-400 rounded-lg mb-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{winner.name}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(winner.wonAt).toLocaleString('id-ID')}
                  </p>
                  {winner.prizeName && (
                    <p className="text-xs text-purple-600">🏆 {winner.prizeName}</p>
                  )}
                </div>
              </div>
              <Trophy className="w-6 h-6 text-yellow-500" />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {winners.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Belum ada pemenang</p>
            <p className="text-sm">Pemenang akan muncul di sini setelah undian</p>
          </div>
        )}
      </div>

      {isExporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span>Mengekspor data...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WinnerHistory;
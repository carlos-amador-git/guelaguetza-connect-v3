import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, QrCode } from 'lucide-react';
import { ARTESANIAS_PREMIUM, VITRINA_TRELLIS, ArtesaniaItem } from '../ar/vitrina/artesanias-data';

const BASE_URL = 'https://guelaguetza-connect-v2.vercel.app';

interface QRCardData {
  item: ArtesaniaItem;
  dataURL: string;
}

const generateQRDataURL = (id: string): Promise<string> =>
  QRCode.toDataURL(`${BASE_URL}/#/ar/${id}`, {
    width: 300,
    margin: 2,
    color: { dark: '#1a1a2e', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });

const QRCard: React.FC<{ card: QRCardData }> = ({ card }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = card.dataURL;
    link.download = `qr-${card.item.id}.png`;
    link.click();
  };

  return (
    <div className="qr-card bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col items-center gap-3 print:shadow-none print:border print:border-gray-300 print:rounded-lg">
      <img
        src={card.dataURL}
        alt={`QR ${card.item.nombre}`}
        className="w-40 h-40 object-contain"
      />
      <div className="text-center">
        <p className="font-semibold text-gray-900 text-sm leading-tight">{card.item.nombre}</p>
        <p className="text-xs text-gray-500 mt-1">Escanea para ver en 3D y AR</p>
      </div>
      <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">
        Guelaguetza Connect 2025
      </p>
      <button
        onClick={handleDownload}
        className="print:hidden flex items-center gap-1.5 text-xs text-oaxaca-purple hover:text-oaxaca-pink transition px-3 py-1.5 rounded-lg border border-oaxaca-purple/30 hover:border-oaxaca-pink/50"
        title="Descargar QR como PNG"
      >
        <Download size={13} />
        Descargar QR
      </button>
    </div>
  );
};

const SectionGrid: React.FC<{ title: string; cards: QRCardData[]; loading: boolean }> = ({
  title,
  cards,
  loading,
}) => (
  <section className="mb-10">
    <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2 print:text-black">
      <QrCode size={16} className="text-oaxaca-purple print:hidden" />
      {title}
    </h2>
    {loading ? (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-gray-100 dark:bg-gray-700 rounded-xl h-52 animate-pulse"
          />
        ))}
      </div>
    ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-3 print:gap-6">
        {cards.map((card) => (
          <QRCard key={card.item.id} card={card} />
        ))}
      </div>
    )}
  </section>
);

const QRCodesPanel: React.FC = () => {
  const [premiumCards, setPremiumCards] = useState<QRCardData[]>([]);
  const [trellisCards, setTrellisCards] = useState<QRCardData[]>([]);
  const [loading, setLoading] = useState(true);

  const generateAll = useCallback(async () => {
    setLoading(true);
    try {
      const [premResults, trellisResults] = await Promise.all([
        Promise.all(
          ARTESANIAS_PREMIUM.map(async (item) => ({
            item,
            dataURL: await generateQRDataURL(item.id),
          }))
        ),
        Promise.all(
          VITRINA_TRELLIS.map(async (item) => ({
            item,
            dataURL: await generateQRDataURL(item.id),
          }))
        ),
      ]);
      setPremiumCards(premResults);
      setTrellisCards(trellisResults);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    generateAll();
  }, [generateAll]);

  const handlePrint = () => window.print();

  return (
    <>
      {/* Print-only styles injected via a style tag */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #qr-print-area, #qr-print-area * { visibility: visible; }
          #qr-print-area { position: absolute; inset: 0; }
          .qr-card {
            break-inside: avoid;
            page-break-inside: avoid;
            position: relative;
          }
          .qr-card::after {
            content: '';
            position: absolute;
            inset: -6px;
            border: 1px dashed #ccc;
            pointer-events: none;
          }
        }
      `}</style>

      <div className="h-full bg-gray-50 dark:bg-gray-950 overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-oaxaca-purple via-oaxaca-pink to-oaxaca-purple text-white px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-xl">Códigos QR — AR</h1>
              <p className="text-xs text-white/70 mt-0.5">
                Imprime y coloca en cada pieza artesanal
              </p>
            </div>
            <button
              onClick={handlePrint}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 disabled:opacity-50 rounded-full text-sm font-medium transition"
            >
              <Printer size={16} />
              Imprimir todos
            </button>
          </div>
        </div>

        {/* Content */}
        <div id="qr-print-area" className="px-4 py-6">
          <SectionGrid
            title="Artesanías Premium"
            cards={premiumCards}
            loading={loading}
          />
          <SectionGrid
            title="Vitrina de Alebrijes (TRELLIS IA)"
            cards={trellisCards}
            loading={loading}
          />

          {!loading && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-6 print:hidden">
              {premiumCards.length + trellisCards.length} códigos QR generados •{' '}
              <span className="font-medium">{BASE_URL}</span>
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default QRCodesPanel;

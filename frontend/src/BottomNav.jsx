import React from 'react';

export default function BottomNav({ 
  mode, 
  setMode, 
  setStep, 
  setErrorMessage, 
  setIsValidRecipient, 
  setTransactionInfo 
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-3xl z-10">
      {/* Container của các nút */}
      <div className="flex justify-between items-center px-6 py-3 relative">

        {/* --- TRANG CHỦ --- */}
        <button 
          onClick={() => {
            setMode('home'); 
            setStep(0); 
            setErrorMessage('');
          }} 
          className={`flex flex-col items-center ${mode === 'home' ? 'text-blue-700' : 'text-slate-400'} hover:text-blue-600 transition-colors`}
        >
          <span className="text-xl mb-0.5">🏠</span>
          <span className="text-[10px] font-bold">Trang chủ</span>
        </button>

        {/* --- CHUYỂN TIỀN --- */}
        <button 
          onClick={() => {
            setMode('transfer'); 
            setStep(0); 
            setErrorMessage(''); 
            setIsValidRecipient(false); 
            setTransactionInfo({ recipientName: '', recipientBank: 'VNU Bank', accountNumber: '', amount: '', time: '' });
          }} 
          className={`flex flex-col items-center mr-8 ${mode === 'transfer' ? 'text-blue-700' : 'text-slate-400'} hover:text-blue-600 transition-colors`}
        >
          <span className="text-xl mb-0.5">💸</span>
          <span className="text-[10px] font-bold">Chuyển tiền</span>
        </button>


        {/* --- NÚT QUÉT QR LỒI LÊN CHÍNH GIỮA --- */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
          <button 
            onClick={() => {
              setMode('qr'); 
              setStep(0); 
              setErrorMessage('');
            }} 
            className="bg-blue-700 w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-lg shadow-blue-700/40 border-[5px] border-slate-100 transition-transform hover:scale-105 active:scale-95"
          >
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path>
            </svg>
            <span className="text-[9px] text-white font-semibold mt-[2px]">Quét QR</span>
          </button>
        </div>


        {/* --- LỊCH SỬ --- */}
        <button 
          onClick={() => {
            setMode('history'); 
            setStep(0); 
            setErrorMessage('');
          }} 
          className={`flex flex-col items-center ml-8 ${mode === 'history' ? 'text-blue-700' : 'text-slate-400'} hover:text-blue-600 transition-colors`}
        >
          <span className="text-xl mb-0.5">📊</span>
          <span className="text-[10px] font-bold">Lịch sử</span>
        </button>

        {/* --- CÁ NHÂN --- */}
        <button 
          onClick={() => {
            setMode('profile'); 
            setStep(0); 
            setErrorMessage('');
          }} 
          className={`flex flex-col items-center ${mode === 'profile' ? 'text-blue-700' : 'text-slate-400'} hover:text-blue-600 transition-colors`}
        >
          <span className="text-xl mb-0.5">👤</span>
          <span className="text-[10px] font-bold">Cá nhân</span>
        </button>

      </div>
    </div>
  );
}
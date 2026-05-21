import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ setMode, setTransactionInfo, currentUser }) {
  const [showMyQr, setShowMyQr] = useState(false);
  const [scanError, setScanError] = useState('');
  
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isScannedRef = useRef(false);

  const myAccount = {
    name: currentUser?.fullname || currentUser?.name || "NGUYỄN VĂN LING",
    number: currentUser?.accountNumber || currentUser?.number || "1234567",
    bank: currentUser?.bank || "VNU Bank"
  };

  // Hàm khởi chạy camera độc lập
  const startCamera = async () => {
    try {
      isScannedRef.current = false;
      
      // KIỂM TRA AN TOÀN: Đảm bảo thẻ div đã thực sự tồn tại trên DOM
      const container = document.getElementById("scanner-video-container");
      if (!container) {
        console.warn("Chưa tìm thấy khung camera, bỏ qua lần chạy này.");
        return;
      }

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("scanner-video-container");
      }

      // Nếu đang bật sẵn thì không gọi start nữa để tránh lỗi
      if (scannerRef.current && scannerRef.current.isScanning) {
        return;
      }

      const config = { fps: 15, qrbox: { width: 250, height: 250 } };

      await scannerRef.current.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          if (isScannedRef.current) return;
          isScannedRef.current = true;
          
          try {
            if (scannerRef.current?.isScanning) {
              await scannerRef.current.stop();
            }
          } catch (e) {
            console.error("Lỗi dừng camera sau khi quét:", e);
          }
          
          handleQrSuccess(decodedText);
        },
        (errorMessage) => { /* Bỏ qua log lỗi liên tục để tránh rác console */ }
      );
    } catch (err) {
      console.error("Lỗi khởi chạy camera:", err);
      setScanError("Không thể truy cập Camera. Vui lòng cấp quyền hoặc chọn ảnh từ thư viện.");
    }
  };

  useEffect(() => {
    let isMounted = true;

    // FIX LỖI MÀN HÌNH TRẮNG: Delay 100ms chờ React render xong DOM 100% rồi mới gọi thư viện
    const initTimer = setTimeout(() => {
      if (isMounted) startCamera();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      
      // FIX LỖI CRASH KHI THOÁT TRANG: Dọn dẹp DOM an toàn
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop()
              .then(() => {
                scannerRef.current.clear();
              })
              .catch(err => console.error("Lỗi stop camera khi unmount:", err));
          } else {
            scannerRef.current.clear();
          }
        } catch (error) {
          console.error("Lỗi cleanup thư viện:", error);
        }
      }
    };
  }, []);

  const handleQrSuccess = (decodedText) => {
    try {
      console.log("Dữ liệu QR nhận được:", decodedText);

      if (decodedText.startsWith("000201")) {
        setTransactionInfo({
          accountNumber: "9999999999",
          recipientName: "ĐỐI TÁC VIETQR CHUẨN",
          recipientBank: "Ngân Hàng Quốc Tế",
          amount: "",
          time: new Date().toLocaleString(),
          rawText: decodedText
        });
        setMode('transfer');
        return;
      }

      const parts = decodedText.split('|');
      
      if (parts.length >= 3) {
        setTransactionInfo({
          accountNumber: parts[0].trim(),
          recipientName: parts[1].trim(),
          recipientBank: parts[2].trim(),
          amount: parts[3] ? parts[3].trim() : '',
          time: new Date().toLocaleString()
        });
        setMode('transfer');
      } else {
        setTransactionInfo({
          accountNumber: decodedText.trim(),
          recipientName: "TRẦN HOÀNG VŨ (DEMO)",
          recipientBank: "VNU Bank",
          amount: '',
          time: new Date().toLocaleString()
        });
        setMode('transfer');
      }
    } catch (e) {
      console.error("Lỗi parse QR:", e);
      alert("Đã xảy ra lỗi khi phân tích dữ liệu mã QR!");
      startCamera(); 
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    e.target.value = '';

    try {
      // Dừng camera an toàn (bọc try catch để không crash web nếu stop thất bại)
      if (scannerRef.current?.isScanning) {
        try {
          await scannerRef.current.stop();
        } catch (stopErr) {
          console.error("Lỗi khóa luồng camera:", stopErr);
        }
      }

      const decodedText = await scannerRef.current.scanFile(file, true);
      
      isScannedRef.current = true;
      handleQrSuccess(decodedText);

    } catch (err) {
      console.error("Lỗi scan file ảnh:", err);
      alert("Không tìm thấy mã QR hợp lệ trong bức ảnh này. Vui lòng thử lại!");
      startCamera();
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-75px)] bg-black text-white overflow-hidden">
      
      {/* Header */}
      <div className="absolute top-0 left-0 w-full pt-6 px-4 flex items-center justify-between z-40 bg-gradient-to-b from-black/80 to-transparent pb-6">
        <button onClick={() => setMode('home')} className="text-white text-xl p-2 z-50">✕</button>
        <div className="flex flex-col items-center">
          <span className="font-bold tracking-widest text-sm uppercase">{myAccount.bank}</span>
          <div className="flex gap-2 text-[10px] text-gray-300 mt-1">
            <span>VietQR</span> • <span>napas 247</span>
          </div>
        </div>
        <div className="w-8"></div>
      </div>

      {/* Vùng hiển thị camera */}
      <div className="absolute inset-0 z-10 w-full h-full bg-zinc-900">
        <div 
          id="scanner-video-container" 
          className="absolute inset-0 w-full h-full z-10 [&>video]:object-cover [&>video]:w-full [&>video]:h-full [&>svg]:hidden"
        ></div>

        {/* Lớp kính ngắm */}
        <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/20 rounded-xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 -mt-[2px] -ml-[2px] rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 -mt-[2px] -mr-[2px] rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 -mb-[2px] -ml-[2px] rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 -mb-[2px] -mr-[2px] rounded-br-xl"></div>
          </div>

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-[160px] w-full text-center px-6">
            {scanError ? (
              <p className="text-red-400 font-semibold bg-black/70 px-3 py-2 rounded-lg inline-block text-sm">{scanError}</p>
            ) : (
              <p className="bg-black/40 px-4 py-2 rounded-full shadow-md backdrop-blur-sm inline-block text-xs text-gray-200">
                Di chuyển camera đến mã QR để quét
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Cụm chức năng */}
      <div className="absolute bottom-20 left-0 right-0 px-6 flex flex-col items-center gap-4 z-40 transition-all duration-300 pointer-events-auto">
        <button 
          onClick={() => fileInputRef.current.click()}
          className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-700 px-5 py-3 rounded-full text-sm font-medium hover:bg-zinc-800 transition-colors shadow-lg animate-bounce"
        >
          📷 <span>Chọn từ Thư viện ảnh</span>
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />

        <div className="w-full bg-zinc-900/95 rounded-2xl border border-zinc-800 overflow-hidden transition-all duration-300 shadow-2xl">
          <button 
            onClick={() => setShowMyQr(!showMyQr)}
            className="w-full py-4 px-4 flex items-center justify-between text-sm font-semibold text-gray-200 border-b border-zinc-800/50 hover:bg-zinc-800/50 outline-none"
          >
            <span className="flex items-center gap-2">📱 Chia sẻ mã QR cá nhân</span>
            <span>{showMyQr ? '▼' : '▲'}</span>
          </button>
          
          {showMyQr && (
            <div className="p-6 flex flex-col items-center justify-center bg-white text-black animate-fade-in rounded-b-2xl">
              <div className="p-3 bg-white border-2 border-blue-700 rounded-2xl shadow-sm">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`${myAccount.number}|${myAccount.name}|${myAccount.bank}`)}`} 
                  alt="My QR Code" 
                  className="w-44 h-44"
                />
              </div>
              <p className="mt-4 font-bold text-base tracking-wide">{myAccount.name}</p>
              <p className="text-xs text-gray-500 font-mono mt-1">{myAccount.bank} • {myAccount.number}</p>
              <p className="text-xs text-gray-400 mt-4 px-4 text-center">Bấm vào đây để đóng mã QR cá nhân.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
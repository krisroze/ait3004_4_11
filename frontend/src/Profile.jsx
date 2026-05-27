import React, { useState } from 'react';

export default function Profile({ currentUser, logo, onLogout, onGoToUpdateFace }) {
  // State quản lý việc ẩn/hiện Popup Mã QR
  const [showQRModal, setShowQRModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [faceIdEnabled, setFaceIdEnabled] = useState(true); // Toggle giả lập
  const [showLinkedModal, setShowLinkedModal] = useState(false);
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showNotiModal, setShowNotiModal] = useState(false);

  // Danh sách các menu trang trí chuẩn Techcombank
  const menuItems = [
    { id: 1, label: "Thông báo", icon: "bell", badge: "2" },
    { id: 2, label: "Liên kết thanh toán", icon: "link" },
    { id: 3, label: "Khám phá sản phẩm", icon: "search" },
    { id: 4, label: "Cài đặt & Bảo mật", icon: "settings" },
    { id: 5, label: "Ưu đãi thẻ", icon: "card", badge: "Mới" },
    { id: 6, label: "Nhận tiền qua mã QR", icon: "qr" }, // Đã đổi tên cho hợp lý
  ];

  // Hàm tạo chuỗi ẩn bớt số điện thoại (VD: 098***1234)
  const maskPhone = (phone) => {
    if (!phone) return "09* *** ****";
    if (phone.length < 10) return phone;
    return `${phone.substring(0, 3)}***${phone.substring(phone.length - 3)}`;
  };

  // Hàm lấy chữ cái đầu của tên để làm Avatar
  const getInitials = (name) => {
    if (!name) return "V";
    const parts = name.trim().split(" ");
    return parts[parts.length - 1].charAt(0).toUpperCase();
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 text-slate-800 font-sans relative">
      
      {/* ========================================== */}
      {/* 1. HEADER: NÂNG CẤP ĐẬM CHẤT CÁ NHÂN */}
      {/* ========================================== */}
      <div className="pt-12 pb-6 px-6 bg-gradient-to-br from-blue-700 to-indigo-900 text-white rounded-b-[32px] shadow-md relative z-10">
        <div className="flex justify-between items-center mb-6">
          <img src={logo} alt="VNU Bank" className="h-8 w-auto object-contain drop-shadow-md" />
          <span className="text-xs font-bold tracking-widest bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm border border-white/30">
            PRO MEMBER
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Avatar chữ cái */}
          <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl font-black border-2 border-white/30 shadow-inner backdrop-blur-md">
            {getInitials(currentUser?.fullname)}
          </div>
          
          {/* Thông tin chi tiết */}
          <div className="text-left flex-1">
            <h2 className="text-xl font-black tracking-wide uppercase mb-1 drop-shadow-md">
              {currentUser?.fullname || "VNU USER"}
            </h2>
            <div className="flex flex-col gap-0.5 opacity-90 text-[11px] font-mono tracking-wider">
              <p>STK: <span className="font-bold text-white text-xs">{currentUser?.accountNumber}</span></p>
              <p>SĐT: <span className="font-bold text-white text-xs">{maskPhone(currentUser?.phoneNumber)}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. DANH SÁCH MENU */}
      {/* ========================================== */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-28">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
          {menuItems.map((item, index) => (
            <div 
              key={item.id} 
              onClick={() => {
                if (item.id === 1) setShowNotiModal(true);
                else if (item.id === 2) setShowLinkedModal(true); // Mở Liên kết
                else if (item.id === 3) setShowExploreModal(true); // Mở Khám phá
                else if (item.id === 4) setShowSettingsModal(true);
                else if (item.id === 5) setShowOfferModal(true);
                else if (item.id === 6) setShowQRModal(true);
              }}
              className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors active:bg-slate-100 ${index !== menuItems.length - 1 ? 'border-b border-slate-50' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.id === 6 ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-500'}`}>
                  {/* SVG Icons */}
                  {item.icon === "bell" && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>}
                  {item.icon === "link" && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>}
                  {item.icon === "search" && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.602 10.602z" /></svg>}
                  {item.icon === "settings" && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.767c-.31.236-.45.633-.366 1.017.004.016.006.032.008.048.01.375.013.751.008 1.125a.75.75 0 01-.008.048c-.083.384.056.781.366 1.017l1.003.767a1.125 1.125 0 01.26 1.43l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.216-.456a1.125 1.125 0 00-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281a.75.75 0 00-.645-.87a6.536 6.536 0 01-.22-.127a.75.75 0 00-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.43l1.003-.767c.31-.236.45-.633.366-1.017a8.955 8.955 0 01-.008-.048c-.01-.375-.014-.752-.008-1.125a.75.75 0 01.008-.048c.083-.384-.056-.781-.366-1.017l-1.003-.767a1.125 1.125 0 01-.26-1.43l1.296-2.247a1.125 1.125 0 011.37-.49l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128c.332-.183.582-.495.644-.869l.214-1.28z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  {item.icon === "card" && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>}
                  {item.icon === "qr" && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" /></svg>}
                </div>
                <span className={`font-semibold text-xs tracking-wide ${item.id === 6 ? 'text-blue-700' : 'text-slate-700'}`}>{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {item.badge && (
                  <span className="text-[9px] font-black text-white px-1.5 py-0.5 rounded bg-red-500 uppercase">
                    {item.badge}
                  </span>
                )}
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-slate-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Nút Đăng xuất */}
        <div className="flex justify-between items-center px-1">
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 bg-slate-800 hover:bg-black text-white px-5 py-3 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Đăng xuất
          </button>
          <button onClick={() => setShowSupportModal(true)} className="text-blue-600 hover:text-blue-800 font-extrabold text-xs tracking-wide px-2 py-1">
            Trung tâm hỗ trợ
          </button>
        </div>

        {/* THÊM VÀO ĐÂY: Phiên bản App (Như Ảnh 6 MB Bank) */}
        <div className="mt-8 mb-4 flex justify-between items-center px-2 text-[11px] text-slate-400 font-medium">
          <span>v1.0.0 (Face Payment)</span>
          <span className="text-blue-600 cursor-pointer">Phiên bản mới nhất</span>
        </div>

      </div> {/* <-- ĐÂY LÀ THẺ ĐÓNG CỦA flex-1 overflow-y-auto px-5 py-4 pb-28 */}

      {/* ========================================== */}
      {/* 3. POPUP MODAL MÃ QR CÁ NHÂN */}
      {/* ========================================== */}
      {showQRModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full rounded-[32px] overflow-hidden shadow-2xl flex flex-col transform transition-all relative">
            
            {/* Nút Đóng */}
            <button 
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center hover:bg-slate-200"
            >
              ✕
            </button>

            {/* Khung chứa mã QR */}
            <div className="pt-10 pb-6 px-6 flex flex-col items-center text-center">
              <h3 className="font-bold text-slate-800 text-lg mb-1">Nhận tiền qua mã QR</h3>
              <p className="text-xs text-slate-500 mb-6">Đưa mã này cho người chuyển tiền hoặc lưu về máy.</p>
              
              <div className="p-3 bg-white border-2 border-blue-100 rounded-3xl shadow-sm mb-6">
                <img 
                  // Tạo QR Code chứa cú pháp: SoTaiKhoan|Ten|VNU Bank (Khớp với file QRScanner.jsx)
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`${currentUser?.accountNumber}|${currentUser?.fullname}|VNU Bank`)}`} 
                  alt="My QR Code" 
                  className="w-48 h-48 rounded-xl object-contain"
                />
              </div>

              <div className="bg-slate-50 w-full py-4 px-2 rounded-xl border border-slate-100">
                <h4 className="font-black text-blue-700 uppercase tracking-widest text-sm mb-1">
                  {currentUser?.fullname}
                </h4>
                <p className="font-mono text-slate-600 text-xs font-semibold">
                  VNU Bank • {currentUser?.accountNumber}
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowQRModal(false)}
              className="w-full bg-blue-700 text-white font-bold py-5 text-sm hover:bg-blue-800 transition-colors"
            >
              HOÀN TẤT
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 4. BOTTOM SHEET CÀI ĐẶT (STYLE MB BANK - ẢNH 7) */}
      {/* ========================================== */}
      {showSettingsModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowSettingsModal(false)}></div>
          
          <div className="bg-slate-50 w-full rounded-t-[32px] p-0 shadow-2xl transform transition-transform relative z-10 animate-slide-up max-h-[85vh] flex flex-col">
            
            {/* Header của bảng cài đặt */}
            <div className="bg-white px-6 pt-4 pb-4 rounded-t-[32px] sticky top-0 z-20 shadow-sm flex items-center justify-between">
              <div className="w-8"></div>
              <h3 className="font-black text-blue-800 text-lg">Cài đặt</h3>
              <button onClick={() => setShowSettingsModal(false)} className="w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-bold">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-6">
              
              {/* GROUP 1: BẢO MẬT (Focus vào Face ID) */}
              <h4 className="font-bold text-slate-800 text-base mb-3 ml-1">Bảo mật Face ID</h4>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
                
                {/* Item 1: Thiết lập khuôn mặt */}
                <div onClick={() => { setShowSettingsModal(false); onGoToUpdateFace(); }} className="flex justify-between items-center p-4 border-b border-slate-100 active:bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" /></svg>
                    <span className="text-sm font-semibold text-slate-700">Thiết lập lại dữ liệu khuôn mặt</span>
                  </div>
                  <span className="text-slate-300">›</span>
                </div>

                {/* Item 2: Đăng nhập bằng Face ID (Toggle) */}
                <div className="flex justify-between items-center p-4 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                    <span className="text-sm font-semibold text-slate-700">Đăng nhập bằng Face ID</span>
                  </div>
                  <button onClick={() => setFaceIdEnabled(!faceIdEnabled)} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 focus:outline-none ${faceIdEnabled ? 'bg-blue-700' : 'bg-slate-200'}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 shadow-sm ${faceIdEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Item 3: Mở khóa Face ID */}
                <div onClick={() => alert("Tính năng Mở khóa Face ID đang được bảo trì!")} className="flex justify-between items-center p-4 active:bg-slate-50 cursor-pointer">
                  <div className="flex gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600 shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-0.5">Mở khóa xác thực khuôn mặt</p>
                      <p className="text-[10px] text-slate-500 pr-4">VNU Bank sẽ tạm khóa tính năng nếu phát hiện bất thường từ Camera.</p>
                    </div>
                  </div>
                  <span className="text-slate-300 shrink-0">›</span>
                </div>
              </div>

              {/* GROUP 2: TÀI KHOẢN MẬT KHẨU */}
              <h4 className="font-bold text-slate-800 text-base mb-3 ml-1">Tài khoản</h4>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm mb-4 overflow-hidden">
                <div onClick={() => alert("Vui lòng đăng xuất và chọn 'Quên mật khẩu' để đổi mật khẩu an toàn.")} className="flex justify-between items-center p-4 active:bg-slate-50 cursor-pointer">
                  <div className="flex items-center gap-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" /></svg>
                    <span className="text-sm font-semibold text-slate-700">Đổi mật khẩu đăng nhập</span>
                  </div>
                  <span className="text-slate-300">›</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 7. POPUP LIÊN KẾT VÍ ĐIỆN TỬ (MOCK) */}
      {/* ========================================== */}
      {showLinkedModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowLinkedModal(false)}></div>
          <div className="bg-white w-full rounded-t-[32px] p-6 shadow-2xl transform transition-transform relative z-10 animate-slide-up">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            <h3 className="font-black text-slate-800 text-lg mb-6 text-center">LIÊN KẾT THANH TOÁN</h3>
            
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex items-center justify-between p-4 bg-pink-50 border border-pink-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-600 rounded-xl flex items-center justify-center text-white font-bold text-xs">MoMo</div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Ví MoMo</p>
                    <p className="text-[10px] text-green-600 font-bold">● Đang liên kết</p>
                  </div>
                </div>
                <button className="text-xs font-bold text-slate-400 border border-slate-200 px-3 py-1.5 rounded-lg bg-white">Hủy</button>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-xs">Zalo</div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">ZaloPay</p>
                    <p className="text-[10px] text-green-600 font-bold">● Đang liên kết</p>
                  </div>
                </div>
                <button className="text-xs font-bold text-slate-400 border border-slate-200 px-3 py-1.5 rounded-lg bg-white">Hủy</button>
              </div>
            </div>
            <button onClick={() => setShowLinkedModal(false)} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl text-sm">ĐÓNG</button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 8. POPUP KHÁM PHÁ (COMING SOON) */}
      {/* ========================================== */}
      {showExploreModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-800 w-full rounded-[32px] overflow-hidden shadow-2xl flex flex-col transform transition-all relative text-white text-center">
            <button onClick={() => setShowExploreModal(false)} className="absolute top-4 right-4 w-8 h-8 bg-black/20 rounded-full flex items-center justify-center hover:bg-black/30">✕</button>
            <div className="pt-12 pb-8 px-6">
              <div className="text-6xl mb-4 animate-bounce">🚀</div>
              <h3 className="font-black text-2xl mb-2">SẮP RA MẮT</h3>
              <p className="text-sm opacity-90 leading-relaxed px-2">Hệ sinh thái tài chính và đầu tư chứng khoán của VNU Bank đang được nâng cấp. Vui lòng quay lại sau nhé!</p>
            </div>
            <button onClick={() => setShowExploreModal(false)} className="w-full bg-white/10 backdrop-blur-md text-white font-bold py-5 text-sm hover:bg-white/20 transition-colors border-t border-white/20">
              TÔI ĐÃ HIỂU
            </button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 9. POPUP TRUNG TÂM HỖ TRỢ */}
      {/* ========================================== */}
      {showSupportModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowSupportModal(false)}></div>
          <div className="bg-white w-full rounded-t-[32px] p-6 shadow-2xl transform transition-transform relative z-10 animate-slide-up">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4"></div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-3">🎧</div>
              <h3 className="font-black text-slate-800 text-lg">TRUNG TÂM HỖ TRỢ</h3>
              <p className="text-xs text-slate-500">Hoạt động 24/7 để giải đáp thắc mắc</p>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6 text-center">
              <p className="text-xs text-slate-500 mb-1 uppercase tracking-widest font-bold">Hotline Tổng Đài</p>
              <p className="text-2xl font-black text-blue-700 tracking-wider">1900 1234</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col items-center gap-2 hover:bg-slate-50 active:scale-95 transition-all">
                <span className="text-xl">💬</span>
                <span className="text-xs font-bold text-slate-700">Chat trực tuyến</span>
              </button>
              <button className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col items-center gap-2 hover:bg-slate-50 active:scale-95 transition-all">
                <span className="text-xl">✉️</span>
                <span className="text-xs font-bold text-slate-700">Gửi Email</span>
              </button>
            </div>
            
            <button onClick={() => setShowSupportModal(false)} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl text-sm">ĐÓNG</button>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* POPUP THÔNG BÁO (GIẢ LẬP) */}
      {/* ========================================== */}
      {showNotiModal && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          {/* Nhấn vào nền đen để đóng */}
          <div className="absolute inset-0" onClick={() => setShowNotiModal(false)}></div>
          
          <div className="bg-white w-full rounded-t-[32px] p-6 shadow-2xl transform transition-transform relative z-10 animate-slide-up h-3/4 flex flex-col">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 text-lg">THÔNG BÁO TỪ VNU BANK</h3>
              <span onClick={() => setShowNotiModal(false)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-blue-100">
                Đóng
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2">
              {/* Thông báo 1 */}
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <h4 className="font-bold text-sm text-slate-800 mb-1">🎁 Quà tặng mở tài khoản</h4>
                <p className="text-xs text-slate-600">Chúc mừng bạn đã mở thành công tài khoản VNU Bank. Hệ thống đã tặng 500,000 VND vào tài khoản để trải nghiệm.</p>
                <p className="text-[10px] text-slate-400 mt-2">Hôm nay</p>
              </div>

              {/* Thông báo 2 */}
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-400"></div>
                <h4 className="font-bold text-sm text-slate-800 mb-1">🔒 Đăng nhập thiết bị mới</h4>
                <p className="text-xs text-slate-600">Tài khoản của bạn vừa đăng nhập trên thiết bị Web Browser (IP: 127.0.0.1). Nếu không phải bạn, hãy khóa thẻ ngay!</p>
                <p className="text-[10px] text-slate-400 mt-2">Hôm qua</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
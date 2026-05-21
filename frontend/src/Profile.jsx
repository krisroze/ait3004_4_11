import React from 'react';

export default function Profile({ userName, logo, onLogout }) {
  // Danh sách các menu trang trí chuẩn Techcombank
  const menuItems = [
    { id: 1, label: "Thông báo", icon: "bell", badge: "2" },
    { id: 2, label: "Liên kết thanh toán", icon: "link" },
    { id: 3, label: "Khám phá sản phẩm", icon: "search" },
    { id: 4, label: "Cài đặt", icon: "settings" },
    { id: 5, label: "Ưu đãi thẻ", icon: "card", badge: "Mới" },
    { id: 6, label: "Giới thiệu bạn bè", icon: "users" },
  ];

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 font-sans">
      
      {/* HEADER: Màu xanh Gradient đồng bộ với Trang chủ ở Ảnh 1 */}
      <div className="pt-12 pb-6 px-6 bg-gradient-to-br from-blue-700 to-indigo-900 text-white rounded-b-[32px] shadow-md relative">
        <div className="flex justify-between items-center mb-5">
          {/* Logo VNU Shield truyền từ App.jsx */}
          <img src={logo} alt="VNU Bank" className="h-8 w-auto object-contain drop-shadow-md" />
          <span className="text-xs font-bold tracking-widest bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
            PRO
          </span>
        </div>
        
        {/* Lời chào mừng chủ tài khoản */}
        <div className="text-left">
          <p className="opacity-80 text-xs">Xin chào,</p>
          <h2 className="text-xl font-black tracking-wide uppercase mt-0.5">{userName}</h2>
        </div>
      </div>

      {/* DANH SÁCH CÁC TIỆN ÍCH (SCROLLABLE) */}
      <div className="flex-1 overflow-y-auto px-6 py-2 pb-28">
        {menuItems.map((item) => (
          <div 
            key={item.id} 
            className="flex items-center justify-between py-4 border-b border-slate-100 cursor-pointer active:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              {/* Render Icon tương ứng bằng SVG trực tiếp cho nhẹ app */}
              <div className="text-slate-500">
                {item.icon === "bell" && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>}
                {item.icon === "link" && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>}
                {item.icon === "search" && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.602 10.602z" /></svg>}
                {item.icon === "settings" && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.767c-.31.236-.45.633-.366 1.017.004.016.006.032.008.048.01.375.013.751.008 1.125a.75.75 0 01-.008.048c-.083.384.056.781.366 1.017l1.003.767a1.125 1.125 0 01.26 1.43l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.216-.456a1.125 1.125 0 00-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281a.75.75 0 00-.645-.87a6.536 6.536 0 01-.22-.127a.75.75 0 00-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.43l1.003-.767c.31-.236.45-.633.366-1.017a8.955 8.955 0 01-.008-.048c-.01-.375-.014-.752-.008-1.125a.75.75 0 01.008-.048c.083-.384-.056-.781-.366-1.017l-1.003-.767a1.125 1.125 0 01-.26-1.43l1.296-2.247a1.125 1.125 0 011.37-.49l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128c.332-.183.582-.495.644-.869l.214-1.28z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                {item.icon === "card" && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>}
                {item.icon === "users" && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>}
              </div>
              <span className="font-semibold text-slate-700 text-xs tracking-wide">{item.label}</span>
            </div>

            <div className="flex items-center gap-1.5">
              {item.badge && (
                <span className="text-[10px] font-black text-white px-1.5 py-0.5 rounded bg-red-500 uppercase scale-90">
                  {item.badge}
                </span>
              )}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 text-slate-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </div>
        ))}

        {/* BOTTOM BUTTONS BAR: Nằm ngay cuối danh sách cuộn, trên BottomNav */}
        <div className="mt-6 pt-2 flex justify-between items-center">
          {/* Nút Đăng xuất thật kích hoạt hàm từ App.jsx */}
          <button 
            onClick={onLogout}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            Đăng xuất
          </button>

          {/* Nút Hỗ trợ trang trí */}
          <button className="text-blue-600 hover:text-blue-800 font-extrabold text-xs tracking-wide px-2 py-1">
            Hỗ trợ
          </button>
        </div>
      </div>

    </div>
  );
}
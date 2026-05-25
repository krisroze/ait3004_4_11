import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import BottomNav from './BottomNav';
import QRScanner from './QRScanner';
import Profile from './Profile';
import vnuShieldLogo from './vnu_shield_logo.png'; 

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8085';

export default function App() {
  const webcamRef = useRef(null);
  
  // ==========================================
  // CÁC STATE QUẢN LÝ HỆ THỐNG
  // ==========================================
  const [mode, setMode] = useState('login'); 
  const [step, setStep] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [currentUser, setCurrentUser] = useState(null);
  const [rememberedUser, setRememberedUser] = useState(null);
  const [historyList, setHistoryList] = useState([]);

  // Tự động kiểm tra tài khoản đã ghi nhớ từ trước
  useEffect(() => {
    const savedUser = localStorage.getItem('vnu_remembered_user');
    if (savedUser) setRememberedUser(JSON.parse(savedUser));
  }, []);

  // Lấy lịch sử giao dịch khi vào màn hình lịch sử
  const fetchTransactionHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/history`);
      setHistoryList(response.data);
    } catch (error) {
      console.error("Lỗi lấy lịch sử:", error);
    }
  };

  useEffect(() => {
    if (mode === 'history') fetchTransactionHistory();
  }, [mode]);

  // ==========================================
  // STATE CÁC FORM NHẬP LIỆU
  // ==========================================
  const [loginInfo, setLoginInfo] = useState({ accountNumber: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [forgotInfo, setForgotInfo] = useState({ accountNumber: '', newPassword: '' });
  // CẬP NHẬT: Thêm phoneNumber vào form đăng ký tài khoản
  const [registerInfo, setRegisterInfo] = useState({ fullname: '', phoneNumber: '', accountNumber: '', bankName: 'VNU Bank', password: '' });
  const [transactionInfo, setTransactionInfo] = useState({ recipientName: '', recipientBank: 'VNU Bank', accountNumber: '', amount: '', time: '' });
  const [isValidRecipient, setIsValidRecipient] = useState(false);
  
  // THÊM MỚI: State quản lý form nạp tiền điện thoại
  const [topupInfo, setTopupInfo] = useState({ phoneNumber: '', amount: '50000' }); // Mặc định chọn gói 50k

  // ==========================================
  // LOGIC XỬ LÝ CHỨC NĂNG TÍCH HỢP BACKEND
  // ==========================================
  
  // 1. Đăng nhập bằng mật khẩu
  const handleLoginSubmit = async () => {
    const accountToLogin = rememberedUser ? rememberedUser.accountNumber : loginInfo.accountNumber;
    if (!accountToLogin || !loginInfo.password) {
      setErrorMessage('❌ Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    setErrorMessage(''); setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/login`, {
        account_number: accountToLogin,
        password: loginInfo.password
      });
      if (response.status === 200) {
        // CẬP NHẬT: Lưu thêm phoneNumber từ backend vào state người dùng hiện tại
        const userData = { 
          fullname: response.data.fullname, 
          balance: response.data.balance, 
          accountNumber: response.data.account_number,
          phoneNumber: response.data.phone_number 
        };
        setCurrentUser(userData);
        localStorage.setItem('vnu_remembered_user', JSON.stringify(userData));
        setRememberedUser(userData);
        setLoginInfo({ accountNumber: '', password: '' });
        setMode('home');
      }
    } catch (error) { 
      setErrorMessage('❌ Mật khẩu hoặc tài khoản không chính xác!'); 
    } finally { 
      setIsLoading(false); 
    }
  };

  // 2. Đăng nhập bằng khuôn mặt (FaceID)
  const handleLoginFaceSubmit = async () => {
    setErrorMessage(''); setIsLoading(true);
    const imageBase64 = webcamRef.current?.getScreenshot();
    if (!imageBase64) { 
      setErrorMessage('❌ Lỗi Camera. Không thể chụp ảnh!'); 
      setIsLoading(false); 
      return; 
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/login-face`, {
        account_number: rememberedUser.accountNumber,
        image_data: imageBase64
      });
      if (response.status === 200) {
        // CẬP NHẬT: Lưu thêm phoneNumber khi quét mặt thành công
        const userData = { 
          fullname: response.data.fullname, 
          balance: response.data.balance, 
          accountNumber: response.data.account_number,
          phoneNumber: response.data.phone_number
        };
        setCurrentUser(userData);
        setMode('home'); 
        setStep(0);
      }
    } catch (error) {
      setErrorMessage('❌ ' + (error.response?.data?.detail || 'Khuôn mặt không khớp!'));
    } finally { 
      setIsLoading(false); 
    }
  };

  // 3. Khôi phục / Đổi mật khẩu khi quên (Có quét mặt)
  const handleForgotPasswordSubmit = async () => {
    const imageBase64 = webcamRef.current?.getScreenshot();
    if (!imageBase64) {
      setErrorMessage('❌ Lỗi Camera! Chưa chụp được ảnh khuôn mặt.');
      setIsLoading(false);
      return;
    }

    setErrorMessage(''); setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/reset-password`, {
        account_number: forgotInfo.accountNumber,
        new_password: forgotInfo.newPassword,
        image_data: imageBase64
      });
      if (response.status === 200) {
        alert("🎉 Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
        setForgotInfo({ accountNumber: '', newPassword: '' });
        setMode('login');
        setStep(0);
      }
    } catch (error) {
      setErrorMessage('❌ ' + (error.response?.data?.detail || 'Khuôn mặt không khớp hoặc sai số tài khoản!'));
    } finally { 
      setIsLoading(false); 
    }
  };

  // 4. Mở tài khoản mới kèm chụp FaceID
  const handleRegisterSubmit = async () => {
    if (!registerInfo.fullname || !registerInfo.phoneNumber || !registerInfo.accountNumber || !registerInfo.password) {
      setErrorMessage('❌ Vui lòng nhập đầy đủ tất cả các trường thông tin!');
      return;
    }

    setErrorMessage(''); setIsLoading(true);
    const imageBase64 = webcamRef.current?.getScreenshot();
    if (!imageBase64) {
      setErrorMessage('❌ Chưa chụp được ảnh khuôn mặt sinh trắc học!');
      setIsLoading(false);
      return;
    }
    try {
      // CẬP NHẬT: Gửi thêm phone_number lên API đăng ký mới
      const response = await axios.post(`${API_BASE_URL}/api/register`, { 
        fullname: registerInfo.fullname, 
        phone_number: registerInfo.phoneNumber,
        account_number: registerInfo.accountNumber, 
        bank_name: registerInfo.bankName, 
        password: registerInfo.password, 
        image_data: imageBase64 
      });
      if (response.status === 201) {
        alert(`🎉 Đăng ký tài khoản thành công! Khởi tạo tặng ngay 500.000 VND.`);
        const userData = { 
          fullname: response.data.fullname, 
          balance: 500000, 
          accountNumber: response.data.account_number,
          phoneNumber: response.data.phone_number
        };
        setCurrentUser(userData); 
        localStorage.setItem('vnu_remembered_user', JSON.stringify(userData)); 
        setRememberedUser(userData);
        setMode('home'); 
        setStep(0);
      }
    } catch (error) { 
      setErrorMessage('❌ ' + (error.response?.data?.detail || 'Lỗi đăng ký! Số tài khoản hoặc số điện thoại đã tồn tại.')); 
    } finally { 
      setIsLoading(false); 
    }
  };

  // 4.5 Tự động kiểm tra số tài khoản người nhận trong cùng hệ thống VNU
  const handleCheckRecipient = async () => {
    if (!transactionInfo.accountNumber) {
      setErrorMessage('❌ Vui lòng nhập số tài khoản trước khi kiểm tra!');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/check-recipient/${transactionInfo.accountNumber}`);
      if (response.status === 200) {
        setTransactionInfo({
          ...transactionInfo,
          recipientName: response.data.fullname
        });
        setIsValidRecipient(true);
      }
    } catch (error) {
      setTransactionInfo({ ...transactionInfo, recipientName: '' });
      setIsValidRecipient(false);
      setErrorMessage('❌ ' + (error.response?.data?.detail || 'Không tìm thấy thông tin tài khoản người nhận!'));
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Xác thực FaceID thực hiện chuyển tiền
  const handleTransferFaceAuth = async () => {
    if (!currentUser) return;
    setErrorMessage(''); setIsLoading(true);
    const imageBase64 = webcamRef.current?.getScreenshot();
    if (!imageBase64) {
      setErrorMessage('❌ Lỗi Camera! Không thể lấy dữ liệu ảnh để ký số giao dịch.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/execute-transfer`, { 
        sender_account_number: currentUser.accountNumber,
        recipient_account_number: transactionInfo.accountNumber,
        amount: parseFloat(transactionInfo.amount),
        image_data: imageBase64 
      });
      
      if (response.data.status === 'success') { 
        setCurrentUser({ ...currentUser, balance: response.data.new_balance });
        setTransactionInfo({ ...transactionInfo, time: new Date().toLocaleString('vi-VN') }); 
        setStep(2); 
      }
    } catch (error) { 
      setErrorMessage('❌ ' + (error.response?.data?.detail || 'Giao dịch chuyển tiền thất bại!'));
    } finally { 
      setIsLoading(false); 
    }
  };

  // THÊM MỚI: Xử lý Xác thực FaceID để thực hiện NẠP TIỀN ĐIỆN THOẠI
  const handleTopupFaceAuth = async () => {
    if (!currentUser) return;
    if (!topupInfo.phoneNumber) {
      setErrorMessage('❌ Vui lòng nhập số điện thoại cần nạp!');
      return;
    }
    
    setErrorMessage(''); setIsLoading(true);
    const imageBase64 = webcamRef.current?.getScreenshot();
    if (!imageBase64) {
      setErrorMessage('❌ Lỗi Camera! Không thể chụp ảnh xác thực.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/topup`, {
        account_number: currentUser.accountNumber,
        phone_number: topupInfo.phoneNumber,
        amount: parseInt(topupInfo.amount),
        image_data: imageBase64
      });

      if (response.data.status === 'success') {
        setCurrentUser({ ...currentUser, balance: response.data.new_balance });
        setStep(2); // Chuyển sang bước 2: Hiện màn hình thông báo thành công
      }
    } catch (error) {
      setErrorMessage('❌ ' + (error.response?.data?.detail || 'Giao dịch nạp tiền thất bại!'));
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Cập nhật lại khuôn mặt FaceID mới
  const handleUpdateFaceSubmit = async () => {
    setErrorMessage(''); setIsLoading(true);
    const imageBase64 = webcamRef.current?.getScreenshot();
    try {
      const response = await axios.post(`${API_BASE_URL}/api/update-face`, { 
        account_number: currentUser.accountNumber, 
        image_data: imageBase64 
      });
      if (response.status === 200) { 
        alert("🎉 Cập nhật FaceID thành công!"); 
        setMode('home'); 
        setStep(0); 
      }
    } catch (error) { 
      setErrorMessage('❌ Lỗi hệ thống, không thể cập nhật FaceID!'); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleSwitchAccount = () => {
    localStorage.removeItem('vnu_remembered_user');
    setRememberedUser(null);
    setLoginInfo({ accountNumber: '', password: '' });
    setErrorMessage('');
  };

  const handleLogout = () => { 
    setCurrentUser(null); 
    setMode('login'); 
    setErrorMessage('');
  };

  const AppHeader = ({ title, onBack }) => (
    <div className="pt-10 px-5 pb-4 flex items-center justify-between bg-white border-b border-slate-100">
      <div className="text-3xl cursor-pointer text-blue-700 w-8" onClick={onBack}>‹</div>
      <div className="text-base font-bold text-slate-800">{title}</div>
      <div className="w-8"></div>
    </div>
  );

  const FaceAuthCamera = ({ title, desc, btnText, onConfirm, loadText, onBack }) => (
    <div className="flex flex-col h-full bg-white">
      <AppHeader title={title} onBack={onBack} />
      <div className="p-6 text-center flex-1 flex flex-col justify-between">
        <div>
          <p className="text-slate-500 text-sm mb-6">{desc}</p>
          <div className="relative w-56 h-56 mx-auto rounded-full overflow-hidden border-[6px] border-blue-700 shadow-lg shadow-blue-700/30">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-400 animate-[scan_2.5s_infinite_linear] z-10 shadow-[0_0_10px_#3b82f6]"></div>
            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover" />
            {isLoading && (
              <div className="absolute inset-0 bg-slate-900/80 text-white flex items-center justify-center font-bold text-sm">
                {loadText}
              </div>
            )}
          </div>
          {errorMessage && <p className="text-red-500 text-xs mt-3 font-semibold">{errorMessage}</p>}
        </div>
        <button onClick={onConfirm} disabled={isLoading} className="w-full py-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-2xl shadow-lg transition-all">
          {isLoading ? 'ĐANG XỬ LÝ...' : btnText}
        </button>
      </div>
    </div>
  );

  // ==========================================
  // RENDER MÀN HÌNH ĐĂNG NHẬP CHÍNH
  // ==========================================
  if (mode === 'login') return (
    <div className="bg-slate-200 min-h-screen flex justify-center items-center font-sans antialiased">
      <div className="w-[375px] h-[812px] rounded-[40px] overflow-hidden shadow-2xl relative border-[8px] border-slate-900 bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex flex-col">
        <div className="p-6 flex justify-between items-center text-sm font-semibold z-10">
          <div>VNU Bank</div>
          <div className="opacity-80">VN | EN</div>
        </div>

        <div className="flex-1 px-8 flex flex-col justify-center pb-16">
          <div className="mb-8 text-center flex justify-center items-center">
            <img 
              src={vnuShieldLogo} 
              alt="VNU Bank Logo" 
              className="w-28 h-28 object-contain bg-transparent mix-blend-lighten drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]" 
            />
          </div>

          {rememberedUser ? (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white/15 mx-auto mb-4 flex justify-center items-center backdrop-blur-sm border-2 border-white/40 shadow-md">
                <span className="text-4xl">👤</span>
              </div>
              <div className="text-white/70 text-sm">Xin chào,</div>
              <div className="text-2xl font-bold mb-6 tracking-wide">{rememberedUser.fullname.toUpperCase()}</div>
              
              <div className="relative w-full mb-5">
                <input type={showPassword ? "text" : "password"} placeholder="Nhập mật khẩu" value={loginInfo.password} onChange={(e) => setLoginInfo({...loginInfo, password: e.target.value})} className="w-full bg-white/15 border border-white/30 py-4 pl-5 pr-24 rounded-2xl text-white placeholder-white/60 text-sm backdrop-blur-md outline-none focus:border-blue-400 transition-all box-sizing-border" />
                <div className="absolute right-4 top-3.5 flex items-center gap-3.5 select-none">
                  <span onClick={() => setShowPassword(!showPassword)} className="cursor-pointer text-lg">{showPassword ? '👁️‍eqn' : '👁️'}</span>
                  <span onClick={() => {setMode('login_face'); setErrorMessage('');}} className="cursor-pointer flex items-center" title="Đăng nhập Face ID">
                    <svg className="w-6 h-6 text-white/80 hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
                      <path d="M9 10h.01M15 10h.01" />
                      <path d="M12 12v2" />
                      <path d="M10 16a4 4 0 0 0 4 0" />
                    </svg>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-left">
              <h2 className="text-2xl font-bold mb-6 tracking-tight text-white">Đăng nhập</h2>
              <div className="w-full mb-4">
                <input type="text" placeholder="Tên đăng nhập (Số tài khoản)" value={loginInfo.accountNumber} onChange={(e) => setLoginInfo({...loginInfo, accountNumber: e.target.value})} className="w-full bg-white/15 border border-white/30 py-4 px-5 rounded-2xl text-white placeholder-white/60 text-sm backdrop-blur-md outline-none focus:border-blue-400 transition-all box-sizing-border" />
              </div>
              <div className="relative w-full mb-5">
                <input type={showPassword ? "text" : "password"} placeholder="Mật khẩu" value={loginInfo.password} onChange={(e) => setLoginInfo({...loginInfo, password: e.target.value})} className="w-full bg-white/15 border border-white/30 py-4 pl-5 pr-14 rounded-2xl text-white placeholder-white/60 text-sm backdrop-blur-md outline-none focus:border-blue-400 transition-all box-sizing-border" />
                <div className="absolute right-4 top-4 text-lg select-none">
                  <span onClick={() => setShowPassword(!showPassword)} className="cursor-pointer">{showPassword ? '👁️‍eqn' : '👁️'}</span>
                </div>
              </div>
            </div>
          )}

          {errorMessage && <p className="text-red-200 text-xs font-medium mb-3">{errorMessage}</p>}
          <button onClick={handleLoginSubmit} disabled={isLoading} className="w-full py-4 bg-white text-blue-700 font-bold rounded-2xl shadow-lg hover:bg-slate-50 transition-all text-sm tracking-wider">
            {isLoading ? 'ĐANG KẾT NỐI...' : 'ĐĂNG NHẬP'}
          </button>

          <div className="flex justify-between mt-6 text-xs font-bold tracking-wide text-white/90">
            <span className="cursor-pointer hover:underline" onClick={() => {setMode('forgot_password'); setErrorMessage(''); setStep(0);}}>QUÊN MẬT KHẨU?</span>
            {rememberedUser ? (
              <span className="cursor-pointer hover:underline" onClick={handleSwitchAccount}>TÀI KHOẢN KHÁC</span>
            ) : (
              <span className="cursor-pointer hover:underline" onClick={() => {setMode('register'); setStep(0); setErrorMessage('');}}>MỞ TÀI KHOẢN</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // MÀN HÌNH QUÊN MẬT KHẨU (2 BƯỚC)
  // ==========================================
  if (mode === 'forgot_password') {
    if (step === 0) {
      return (
        <div className="bg-slate-200 min-h-screen flex justify-center items-center font-sans antialiased">
          <div className="w-[375px] h-[812px] rounded-[40px] overflow-hidden shadow-2xl relative border-[8px] border-slate-900 bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex flex-col">
            <div className="p-6 flex justify-between items-center">
              <div className="text-2xl cursor-pointer" onClick={() => {setMode('login'); setErrorMessage(''); setStep(0);}}>‹</div>
              <div className="text-sm font-bold">Khôi phục mật khẩu</div>
              <div className="w-6"></div>
            </div>
            <div className="flex-1 px-8 flex flex-col justify-center pb-24">
              <div className="text-center mb-4 text-5xl">🔐</div>
              <p className="text-white/80 text-center mb-6 text-xs px-2">Vui lòng nhập số tài khoản ngân hàng và thiết lập mật khẩu mới muốn thay đổi.</p>
              
              <div className="w-full mb-4">
                <input type="text" placeholder="Số tài khoản của bạn" value={forgotInfo.accountNumber} onChange={(e) => setForgotInfo({...forgotInfo, accountNumber: e.target.value})} className="w-full bg-white/15 border border-white/30 py-4 px-5 rounded-2xl text-white placeholder-white/60 text-sm backdrop-blur-md outline-none focus:border-blue-400 transition-all" />
              </div>
              <div className="w-full mb-5">
                <input type="password" placeholder="Mật khẩu mới hoàn toàn" value={forgotInfo.newPassword} onChange={(e) => setForgotInfo({...forgotInfo, newPassword: e.target.value})} className="w-full bg-white/15 border border-white/30 py-4 px-5 rounded-2xl text-white placeholder-white/60 text-sm backdrop-blur-md outline-none focus:border-blue-400 transition-all" />
              </div>

              {errorMessage && <p className="text-red-200 text-xs font-semibold mb-3">{errorMessage}</p>}
              
              <button 
                onClick={() => {
                  if (!forgotInfo.accountNumber || !forgotInfo.newPassword) {
                    setErrorMessage('❌ Vui lòng nhập Số tài khoản và Mật khẩu mới!');
                  } else {
                    setErrorMessage('');
                    setStep(1); 
                  }
                }} 
                className="w-full py-4 bg-white text-blue-700 font-bold rounded-2xl shadow-lg hover:bg-slate-50 transition-all text-sm">
                TIẾP TỤC QUÉT MẶT
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="bg-slate-200 min-h-screen flex justify-center items-center font-sans antialiased">
          <div className="w-[375px] h-[812px] rounded-[40px] overflow-hidden shadow-2xl relative border-[8px] border-slate-900 flex flex-col">
            <FaceAuthCamera 
              title="Xác thực khuôn mặt" 
              desc={`Đang xác thực chủ tài khoản ${forgotInfo.accountNumber} để đổi mật khẩu`}
              btnText="XÁC NHẬN ĐỔI MẬT KHẨU"
              loadText="ĐANG SO KHỚP..."
              onConfirm={handleForgotPasswordSubmit}
              onBack={() => setStep(0)}
            />
          </div>
        </div>
      );
    }
  }

  // KHU VỰC CÁC MÀN HÌNH SAU ĐĂNG NHẬP
  return (
    <div className="bg-slate-200 min-h-screen flex justify-center items-center font-sans antialiased">
      <div className="w-[375px] h-[812px] rounded-[40px] overflow-hidden shadow-2xl relative border-[8px] border-slate-900 bg-white">
        
        {/* CHỨC NĂNG: ĐĂNG NHẬP CAMERA FACE ID */}
        {mode === 'login_face' && (
          <FaceAuthCamera title="ĐĂNG NHẬP FACE ID" desc="Vui lòng để mặt song song và nhìn thẳng vào camera." btnText="XÁC THỰC KHUÔN MẶT" onConfirm={handleLoginFaceSubmit} loadText="ĐANG ĐỐI CHIẾU..." onBack={() => {setMode('login'); setErrorMessage('');}} />
        )}

        {/* CHỨC NĂNG: MÀN HÌNH CHỦ (HOME DASHBOARD) */}
        {mode === 'home' && (
          <div className="flex flex-col h-full">
            <div className="pt-10 px-6 pb-8 bg-gradient-to-br from-blue-700 to-indigo-900 text-white rounded-b-[32px] shadow-md">
              <div className="font-bold text-base mb-4 flex items-center gap-2">
                <img 
                  src={vnuShieldLogo} 
                  alt="VNU Bank" 
                  className="w-6 h-6 object-contain drop-shadow-md" 
                />
                VNU Bank
              </div>
              <div className="opacity-80 text-xs">Xin chào,</div>
              <div className="text-xl font-bold tracking-wide">{currentUser?.fullname.toUpperCase()}</div>
            </div>
            
            <div className="flex-1 bg-slate-50 px-6 pt-5 overflow-y-auto pb-24">
              {/* Thẻ Ngân Hàng */}
              <div className="p-6 rounded-2xl text-white bg-gradient-to-tr from-slate-800 to-slate-900 relative mb-6 shadow-xl">
                <div className="text-[11px] opacity-70 uppercase tracking-widest">Số dư khả dụng</div>
                <div className="text-2xl font-bold my-2">{currentUser?.balance.toLocaleString()} VND</div>
                <div className="absolute bottom-4 right-5 text-sm font-black tracking-wider text-amber-400">VISA</div>
              </div>
              
              {/* Grid 6 nút tính năng */}
              <div className="grid grid-cols-2 gap-4">
                {/* Nút 1: Chuyển tiền */}
                <button 
                  onClick={() => {setMode('transfer'); setStep(0); setErrorMessage(''); setIsValidRecipient(false); setTransactionInfo({ recipientName: '', recipientBank: 'VNU Bank', accountNumber: '', amount: '', time: '' });}}
                  className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-50 hover:shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 text-center">Chuyển tiền</span>
                </button>

                {/* Nút 2: Cập nhật mặt */}
                <button 
                  onClick={() => {setMode('update_face'); setStep(1); setErrorMessage('');}}
                  className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-50 hover:shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 text-center">Cập nhật mặt</span>
                </button>

                {/* CẬP NHẬT: Nút 3 - Kích hoạt chức năng Nạp tiền điện thoại */}
                <button 
                  onClick={() => {
                    setMode('topup'); 
                    setStep(0); 
                    setErrorMessage('');
                    // Gọi số điện thoại mặc định của người dùng
                    setTopupInfo({ phoneNumber: currentUser?.phoneNumber || '', amount: '50000' });
                  }}
                  className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-50 hover:shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" /></svg>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 text-center">Nạp tiền ĐT</span>
                </button>

                {/* Nút 4: Tiết kiệm */}
                <button className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-50 hover:shadow-md transition-all active:scale-95 cursor-pointer">
                  <div className="w-10 h-10 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 text-center">Tiết kiệm</span>
                </button>

                {/* Nút 5: Mở tài khoản số đẹp */}
                <button className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-50 hover:shadow-md transition-all active:scale-95 relative cursor-pointer">
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">HOT</span>
                  <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 text-center leading-tight">TK số đẹp</span>
                </button>

                {/* Nút 6: Đầu tư tự động */}
                <button className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-50 hover:shadow-md transition-all active:scale-95 cursor-pointer">
                  <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 text-center leading-tight">Đầu tư<br/>tự động</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CHỨC NĂNG: MỞ TÀI KHOẢN (REGISTER) - ĐÃ THÊM Ô SỐ ĐIỆN THOẠI */}
        {mode === 'register' && (
          <div className="h-full flex flex-col bg-white">
            {step === 0 ? (
              <>
                <AppHeader title="MỞ TÀI KHOẢN MỚI" onBack={() => {setMode('login'); setErrorMessage('');}} />
                <div className="p-6 flex-1 overflow-y-auto">
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 mb-2">HỌ VÀ TÊN</label>
                    <input value={registerInfo.fullname} onChange={(e)=>setRegisterInfo({...registerInfo, fullname: e.target.value.toUpperCase()})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 font-semibold" placeholder="NGUYEN VAN A" />
                  </div>
                  
                  {/* CẬP NHẬT: Thêm trường nhập số điện thoại */}
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 mb-2">SỐ ĐIỆN THOẠI</label>
                    <input type="tel" value={registerInfo.phoneNumber} onChange={(e)=>setRegisterInfo({...registerInfo, phoneNumber: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500" placeholder="09xx xxx xxx" />
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 mb-2">SỐ TÀI KHOẢN MONG MUỐN</label>
                    <input type="number" value={registerInfo.accountNumber} onChange={(e)=>setRegisterInfo({...registerInfo, accountNumber: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500" placeholder="Nhập số tài khoản tự chọn" />
                  </div>
                  <div className="mb-5">
                    <label className="block text-xs font-bold text-slate-500 mb-2">MẬT KHẨU BẢO MẬT</label>
                    <input type="password" value={registerInfo.password} onChange={(e)=>setRegisterInfo({...registerInfo, password: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500" placeholder="••••••••" />
                  </div>
                  {errorMessage && <p className="text-red-500 text-xs mt-3 font-semibold">{errorMessage}</p>}
                  <button onClick={() => { if(!registerInfo.fullname || !registerInfo.phoneNumber || !registerInfo.accountNumber || !registerInfo.password) return alert("Vui lòng điền đầy đủ 4 ô thông tin!"); setStep(1); setErrorMessage(''); }} className="w-full py-4 bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm mt-2">
                    TIẾP TỤC QUÉT MẶT
                  </button>
                </div>
              </>
            ) : (
              <FaceAuthCamera title="CHỤP FACE ID ĐĂNG KÝ" desc="Quét gương mặt để thiết lập bảo mật sinh trắc học sinh viên." btnText="HOÀN TẤT TẠO TÀI KHOẢN" onConfirm={handleRegisterSubmit} loadText="ĐANG KHỞI TẠO..." onBack={() => setStep(0)} />
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* THÊM MỚI: LUỒNG NẠP TIỀN ĐIỆN THOẠI (TOPUP) */}
        {/* ========================================================= */}
        {mode === 'topup' && (
          <div className="h-full flex flex-col bg-white">
            {/* STEP 0: Chọn thông tin nạp */}
            {step === 0 && (
              <>
                <AppHeader title="NẠP TIỀN ĐIỆN THOẠI" onBack={() => setMode('home')} />
                <div className="p-6 flex-1 overflow-y-auto">
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 mb-2">SỐ ĐIỆN THOẠI NẠP</label>
                    <input 
                      type="tel" 
                      value={topupInfo.phoneNumber} 
                      onChange={(e) => setTopupInfo({...topupInfo, phoneNumber: e.target.value})} 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-lg outline-none focus:border-blue-500 font-bold text-slate-700 tracking-wide" 
                      placeholder="Nhập số điện thoại" 
                    />
                  </div>
                  <div className="mb-5">
                    <label className="block text-xs font-bold text-slate-500 mb-2">CHỌN MỆNH GIÁ</label>
                    <select 
                      value={topupInfo.amount} 
                      onChange={(e) => setTopupInfo({...topupInfo, amount: e.target.value})} 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-lg text-blue-700 font-bold outline-none focus:border-blue-500 appearance-none"
                    >
                      <option value="10000">10,000 VND</option>
                      <option value="20000">20,000 VND</option>
                      <option value="50000">50,000 VND</option>
                      <option value="100000">100,000 VND</option>
                      <option value="200000">200,000 VND</option>
                      <option value="500000">500,000 VND</option>
                    </select>
                  </div>
                  
                  {errorMessage && <p className="text-red-500 text-xs font-semibold mb-4">{errorMessage}</p>}
                  
                  <button onClick={() => { 
                    if (!topupInfo.phoneNumber || !topupInfo.amount) return alert("Vui lòng điền đủ số điện thoại và mệnh giá!"); 
                    if (parseInt(topupInfo.amount) > currentUser.balance) return alert("Số dư tài khoản khả dụng của bạn không đủ!");
                    setStep(1); setErrorMessage(''); 
                  }} className="w-full py-4 bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm mt-4">
                    TIẾP TỤC XÁC THỰC
                  </button>
                </div>
              </>
            )}

            {/* STEP 1: XÁC THỰC FACE ID NẠP TIỀN */}
            {step === 1 && (
              <FaceAuthCamera 
                title="XÁC THỰC NẠP TIỀN" 
                desc="Ký số giao dịch bằng khuôn mặt sinh trắc học để nạp thẻ." 
                btnText="XÁC NHẬN NẠP" 
                onConfirm={handleTopupFaceAuth} 
                loadText="ĐANG XỬ LÝ..." 
                onBack={() => setStep(0)} 
              />
            )}

            {/* STEP 2: THÀNH CÔNG */}
            {step === 2 && (
              <>
                <AppHeader title="KẾT QUẢ GIAO DỊCH" onBack={() => {setMode('home'); setStep(0);}} />
                <div className="p-8 text-center flex-1 flex flex-col justify-center">
                  <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                    ✓
                  </div>
                  <h2 className="text-emerald-500 font-bold text-xl mb-1">NẠP THÀNH CÔNG</h2>
                  <p className="text-slate-400 text-xs mb-6">{new Date().toLocaleString('vi-VN')}</p>
                  <h1 className="text-3xl font-black text-slate-800 mb-2">{Number(topupInfo.amount).toLocaleString()} VND</h1>
                  <p className="text-xs font-semibold text-slate-500 mb-10">Tới SĐT: <span className="text-slate-800 font-bold">{topupInfo.phoneNumber}</span></p>
                  <button onClick={() => {setMode('home'); setStep(0);}} className="w-full py-4 bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm">
                    QUAY VỀ TRANG CHỦ
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* CHỨC NĂNG: LUỒNG CHUYỂN TIỀN (TRANSFER) */}
        {mode === 'transfer' && (
          <div className="h-full flex flex-col bg-white">
            {step === 0 && (
              <>
                <AppHeader title="CHUYỂN TIỀN NHANH 24/7" onBack={() => setMode('home')} />
                <div className="p-6 flex-1 overflow-y-auto">
                  
                  {/* Ô NHẬP SỐ TÀI KHOẢN CÓ NÚT KIỂM TRA TRỰC TIẾP */}
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 mb-2">SỐ TÀI KHOẢN THỤ HƯỞNG</label>
                    <div className="flex gap-2">
                      <input type="number" value={transactionInfo.accountNumber} onChange={(e)=>{ setIsValidRecipient(false); setTransactionInfo({...transactionInfo, accountNumber: e.target.value, recipientName: ''}); }} className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 font-semibold" placeholder="Nhập số tài khoản nhận" />
                      <button onClick={handleCheckRecipient} disabled={isLoading} className="px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs border border-indigo-200 transition-colors">
                        {isLoading ? '...' : 'TÌM 👀'}
                      </button>
                    </div>
                  </div>

                  {/* Ô HIỂN THỊ TÊN NGƯỜI NHẬN TỰ ĐỘNG (CHỈ ĐỌC) */}
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 mb-2">TÊN NGƯỜI NHẬN (HỆ THỐNG VNU)</label>
                    <input value={transactionInfo.recipientName} readOnly className="w-full p-4 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none select-none" placeholder="TÊN SẼ HIỂN THỊ TỰ ĐỘNG" />
                  </div>

                  <div className="mb-5">
                    <label className="block text-xs font-bold text-slate-500 mb-2">SỐ TIỀN CHUYỂN (VND)</label>
                    <input type="number" value={transactionInfo.amount} onChange={(e)=>setTransactionInfo({...transactionInfo, amount: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-lg text-blue-700 font-bold outline-none focus:border-blue-500" placeholder="0" />
                  </div>

                  {errorMessage && <p className="text-red-500 text-xs font-semibold mb-4">{errorMessage}</p>}
                  
                  <button onClick={() => { 
                    if (!transactionInfo.amount || !transactionInfo.accountNumber) return alert("Vui lòng điền đủ số tài khoản và số tiền cần chuyển!"); 
                    if (!isValidRecipient) return alert("Vui lòng bấm nút 'TÌM' để xác thực chính xác tên người thụ hưởng trước!");
                    if (transactionInfo.accountNumber === currentUser.accountNumber) return alert("Hệ thống không cho phép tự chuyển khoản cho chính mình!");
                    if (parseFloat(transactionInfo.amount) > currentUser.balance) return alert("Số dư tài khoản khả dụng của bạn không đủ!");
                    setStep(1); setErrorMessage(''); 
                  }} className="w-full py-4 bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm">
                    TIẾP TỤC XÁC THỰC
                  </button>
                </div>
              </>
            )}
            
            {/* STEP 1: BẬT CAMERA QUÉT CHÂN DUNG */}
            {step === 1 && <FaceAuthCamera title="QUÉT FACE ID CHUYỂN TIỀN" desc="Nhìn thẳng vào ống kính để ký số giao dịch bằng khuôn mặt sinh trắc học." btnText="XÁC THỰC GIAO DỊCH" onConfirm={handleTransferFaceAuth} loadText="AI ĐANG KIỂM TRA MẶT..." onBack={() => setStep(0)} />}
            
            {/* STEP 2: HOÀN TẤT */}
            {step === 2 && (
              <>
                <AppHeader title="TRẠNG THÁI GIAO DỊCH" onBack={() => {setMode('home'); setStep(0);}} />
                <div className="p-8 text-center flex-1 flex flex-col justify-center">
                  <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                    ✓
                  </div>
                  <h2 className="text-emerald-500 font-bold text-xl mb-1">CHUYỂN TIỀN THÀNH CÔNG</h2>
                  <p className="text-slate-400 text-xs mb-6">{transactionInfo.time}</p>
                  <h1 className="text-3xl font-black text-slate-800 mb-2">{Number(transactionInfo.amount).toLocaleString()} VND</h1>
                  <p className="text-xs font-semibold text-slate-500 mb-10">Tới: <span className="text-slate-800 font-bold">{transactionInfo.recipientName}</span></p>
                  <button onClick={() => {setMode('home'); setStep(0);}} className="w-full py-4 bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm">
                    QUAY VỀ TRANG CHỦ
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* CHỨC NĂNG: CẬP NHẬT KHUÔN MẶT MỚI (UPDATE FACEID) */}
        {mode === 'update_face' && step === 1 && (
          <FaceAuthCamera title="CẬP NHẬT FACE ID MỚI" desc="Hệ thống quét ảnh chân dung mới để ghi đè dữ liệu cũ trong cơ sở dữ liệu." btnText="LƯU DỮ LIỆU KHUÔN MẶT" onConfirm={handleUpdateFaceSubmit} loadText="ĐANG CẬP NHẬT..." onBack={() => {setMode('home'); setStep(0);}} />
        )}

        {/* CHỨC NĂNG: LỊCH SỬ GIAO DỊCH (HISTORY LIST) */}
        {mode === 'history' && (
          <div className="h-full flex flex-col bg-white">
            <AppHeader title="LỊCH SỬ BIẾN ĐỘNG SỐ DƯ" onBack={() => setMode('home')} />
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 pb-24">
              {historyList.length === 0 ? (
                <p className="text-slate-400 text-center text-sm mt-10">Chưa ghi nhận giao dịch nào phát sinh.</p>
              ) : (
                historyList.map((tx, idx) => (
                  <div key={idx} className="bg-white mb-3 p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                    <div className="text-left">
                      <span className="block font-bold text-sm text-slate-800">{tx.recipient_name || tx.recipientName || tx.phone_number}</span>
                      <span className="text-[11px] text-slate-400">{tx.time || (tx.phone_number ? 'Nạp tiền điện thoại' : 'Chuyển khoản 24/7')}</span>
                    </div>
                    <span className="text-red-500 font-extrabold text-sm">-{Number(tx.amount).toLocaleString()}đ</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MÀN HÌNH QUÉT MÃ QR */}
        {mode === 'qr' && (
          <QRScanner 
            setMode={setMode} 
            setTransactionInfo={setTransactionInfo} 
            currentUser={currentUser} 
          />
        )}
        
        {/* MÀN HÌNH CÁ NHÂN (PROFILE) */}
        {mode === 'profile' && (
          <Profile 
            userName={currentUser?.fullname || "NGƯỜI DÙNG VNU"} 
            logo={vnuShieldLogo}
            onLogout={handleLogout} 
          />
        )}

        {/* CẬP NHẬT: THANH MENU BOTTOM NAV (Hiển thị thêm khi topup ở bước 0) */}
        {(mode === 'home' || mode === 'qr' || mode === 'history' || mode === 'profile' || (mode === 'transfer' && step === 0) || (mode === 'topup' && step === 0)) && (
          <BottomNav 
            mode={mode} 
            setMode={setMode} 
            setStep={setStep} 
            setErrorMessage={setErrorMessage} 
            setIsValidRecipient={setIsValidRecipient} 
            setTransactionInfo={setTransactionInfo} 
          />
        )}

      </div>
    </div>
  );
}
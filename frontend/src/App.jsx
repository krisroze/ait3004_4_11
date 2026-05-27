import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import BottomNav from './BottomNav';
import QRScanner from './QRScanner';
import Profile from './Profile';
import vnuShieldLogo from './vnu_shield_logo.png'; 

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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

// THÊM MỚI: State và Logic định giá Tài khoản số đẹp
  const [beautifulAccInfo, setBeautifulAccInfo] = useState({ newAccount: '', price: 0 });

  // THÊM MỚI: State cho Thanh toán Hóa đơn
  const [billInfo, setBillInfo] = useState({ provider: 'Điện lực EVN', customerCode: '', amount: 0 });
  const [isBillFetched, setIsBillFetched] = useState(false); // Trạng thái đã tra cứu ra tiền hay chưa

// THÊM MỚI: State quản lý Khóa/Mở thẻ VISA
  const [isCardLocked, setIsCardLocked] = useState(false);
  const [targetCardAction, setTargetCardAction] = useState(null);

  // Hàm tự động tính giá tiền dựa theo độ VIP của số
  const calculateAccountPrice = (accStr) => {
    if (!accStr) return 0;
    if (accStr.length <= 4) return 500000; // Số siêu ngắn
    if (/(\d)\1{3,}/.test(accStr)) return 200000; // Tứ quý, ngũ quý (vd: 8888)
    if (accStr.includes('68') || accStr.includes('86') || accStr.includes('99')) return 100000; // Số lộc phát
    return 50000; // Số bình thường tự chọn
  };

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

  // THÊM MỚI: Xử lý Xác thực mua Tài khoản số đẹp
  const handleBuyBeautifulAccountAuth = async () => {
    if (!currentUser || !beautifulAccInfo.newAccount) return;
    
    setErrorMessage(''); setIsLoading(true);
    const imageBase64 = webcamRef.current?.getScreenshot();
    if (!imageBase64) {
      setErrorMessage('❌ Lỗi Camera! Không thể chụp ảnh xác thực.');
      setIsLoading(false); return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/buy-beautiful-account`, {
        old_account_number: currentUser.accountNumber,
        new_account_number: beautifulAccInfo.newAccount,
        amount: beautifulAccInfo.price,
        image_data: imageBase64
      });

      if (response.data.status === 'success') {
        // Cập nhật lại thông tin user ở máy khách
        const updatedUser = { 
          ...currentUser, 
          balance: response.data.new_balance,
          accountNumber: response.data.new_account 
        };
        setCurrentUser(updatedUser);
        localStorage.setItem('vnu_remembered_user', JSON.stringify(updatedUser));
        setRememberedUser(updatedUser);
        setStep(2); 
      }
    } catch (error) {
      setErrorMessage('❌ ' + (error.response?.data?.detail || 'Giao dịch thất bại!'));
    } finally {
      setIsLoading(false);
    }
  };

  // THÊM MỚI: Xác thực khuôn mặt để Thanh toán Hóa đơn
  const handleBillPaymentAuth = async () => {
    if (!currentUser) return;
    setErrorMessage(''); setIsLoading(true);
    
    const imageBase64 = webcamRef.current?.getScreenshot();
    if (!imageBase64) {
      setErrorMessage('❌ Lỗi Camera!');
      setIsLoading(false); return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/pay-bill`, {
        account_number: currentUser.accountNumber,
        bill_provider: billInfo.provider,
        customer_code: billInfo.customerCode,
        amount: billInfo.amount,
        image_data: imageBase64
      });

      if (response.data.status === 'success') {
        const updatedUser = { ...currentUser, balance: response.data.new_balance };
        setCurrentUser(updatedUser);
        localStorage.setItem('vnu_remembered_user', JSON.stringify(updatedUser));
        setRememberedUser(updatedUser);
        setStep(2); 
      }
    } catch (error) {
      setErrorMessage('❌ ' + (error.response?.data?.detail || 'Thanh toán thất bại!'));
    } finally {
      setIsLoading(false);
    }
  };

  // THÊM MỚI: Xác thực khuôn mặt để Khóa/Mở thẻ
  const handleCardToggleAuth = async () => {
    setErrorMessage(''); setIsLoading(true);
    const imageBase64 = webcamRef.current?.getScreenshot();
    if (!imageBase64) {
      setErrorMessage('❌ Lỗi Camera!');
      setIsLoading(false); return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/login-face`, {
        account_number: currentUser.accountNumber,
        image_data: imageBase64
      });

      if (response.status === 200) {
        setIsCardLocked(targetCardAction === 'lock');
        setStep(2); 
      }
    } catch (error) {
      setErrorMessage('❌ ' + (error.response?.data?.detail || 'Khuôn mặt không khớp! Từ chối thao tác.'));
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

                {/* Nút 4: Thanh toán Hóa đơn (Thay cho Tiết kiệm) */}
                <button 
                  onClick={() => {
                    setMode('bill_payment'); 
                    setStep(0); 
                    setErrorMessage('');
                    setBillInfo({ provider: 'Điện lực EVN', customerCode: '', amount: 0 });
                    setIsBillFetched(false);
                  }}
                  className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-50 hover:shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 text-center">Thanh toán HĐ</span>
                </button>

                {/* Nút 5: Mở tài khoản số đẹp */}
                <button 
                  onClick={() => {
                    setMode('beautiful_account'); 
                    setStep(0); 
                    setErrorMessage('');
                    setBeautifulAccInfo({ newAccount: '', price: 0 });
                  }}
                  className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-50 hover:shadow-md transition-all active:scale-95 relative cursor-pointer"
                >
                  <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">HOT</span>
                  <div className="w-10 h-10 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 text-center leading-tight">TK số đẹp</span>
                </button>

                {/* Nút 6: Quản lý Thẻ (Thay cho Đầu tư tự động) */}
                <button 
                  onClick={() => {
                    setMode('card_manage'); 
                    setStep(0); 
                    setErrorMessage('');
                  }}
                  className="flex flex-col items-center justify-center bg-white p-4 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-50 hover:shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <div className="w-10 h-10 bg-slate-800 text-white rounded-full flex items-center justify-center mb-2 shadow-md">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" /></svg>
                  </div>
                  <span className="text-xs font-semibold text-slate-700 text-center leading-tight">Quản lý thẻ</span>
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
        {/* ========================================================= */}
        {/* THÊM MỚI: LUỒNG MUA TÀI KHOẢN SỐ ĐẸP */}
        {/* ========================================================= */}
        {mode === 'beautiful_account' && (
          <div className="h-full flex flex-col bg-slate-50">
            {step === 0 && (
              <>
                <AppHeader title="TÀI KHOẢN SỐ ĐẸP" onBack={() => setMode('home')} />
                <div className="p-6 flex-1 overflow-y-auto">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                    <p className="text-xs text-yellow-800 font-semibold leading-relaxed">
                      Lưu ý: Sau khi đổi, số tài khoản hiện tại (<span className="font-bold">{currentUser?.accountNumber}</span>) sẽ bị vô hiệu hóa.
                    </p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 mb-2">NHẬP SỐ TÀI KHOẢN MONG MUỐN</label>
                    <input 
                      type="number" 
                      value={beautifulAccInfo.newAccount} 
                      onChange={(e) => {
                        const val = e.target.value;
                        setBeautifulAccInfo({ newAccount: val, price: calculateAccountPrice(val) });
                      }} 
                      className="w-full p-4 bg-white border border-slate-200 rounded-xl text-xl outline-none focus:border-blue-500 font-bold text-blue-700 tracking-wider shadow-sm" 
                      placeholder="Ví dụ: 8888, 686868..." 
                    />
                  </div>
                  
                  {beautifulAccInfo.newAccount && (
                    <div className="mb-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center animate-pulse">
                      <span className="text-sm font-bold text-slate-600">Phí phát hành thẻ:</span>
                      <span className="text-lg font-black text-red-500">{beautifulAccInfo.price.toLocaleString()} VND</span>
                    </div>
                  )}
                  
                  {errorMessage && <p className="text-red-500 text-xs font-semibold mb-4 text-center">{errorMessage}</p>}
                  
                  <button 
                    onClick={() => { 
                      if (!beautifulAccInfo.newAccount) return alert("Vui lòng nhập số tài khoản mong muốn!"); 
                      if (beautifulAccInfo.newAccount === currentUser.accountNumber) return alert("Số này là số bạn đang sử dụng!");
                      if (beautifulAccInfo.price > currentUser.balance) return alert("Số dư khả dụng không đủ để mua số này!");
                      setStep(1); setErrorMessage(''); 
                    }} 
                    className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold rounded-xl shadow-lg text-sm mt-2 transition-all"
                  >
                    MUA SỐ NÀY NGAY
                  </button>
                </div>
              </>
            )}

            {step === 1 && (
              <FaceAuthCamera 
                title="XÁC THỰC THANH TOÁN" 
                desc={`Ký số giao dịch bằng khuôn mặt để thanh toán ${beautifulAccInfo.price.toLocaleString()}đ`} 
                btnText="XÁC NHẬN MUA" 
                onConfirm={handleBuyBeautifulAccountAuth} 
                loadText="ĐANG ĐỔI SỐ..." 
                onBack={() => setStep(0)} 
              />
            )}

            {step === 2 && (
              <>
                <AppHeader title="THÀNH CÔNG" onBack={() => {setMode('home'); setStep(0);}} />
                <div className="p-8 text-center flex-1 flex flex-col justify-center">
                  <div className="w-20 h-20 bg-yellow-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-yellow-500/30">
                    👑
                  </div>
                  <h2 className="text-yellow-600 font-bold text-xl mb-1">ĐỔI SỐ THÀNH CÔNG</h2>
                  <p className="text-slate-500 text-sm mb-6">Số tài khoản mới của bạn là:</p>
                  <div className="bg-slate-100 py-3 px-6 rounded-2xl inline-block mb-10 border-2 border-dashed border-slate-300">
                    <h1 className="text-3xl font-black text-blue-700 tracking-widest">{beautifulAccInfo.newAccount}</h1>
                  </div>
                  <button onClick={() => {setMode('home'); setStep(0);}} className="w-full py-4 bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm">
                    TRẢI NGHIỆM NGAY
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* ========================================================= */}
        {/* THÊM MỚI: LUỒNG THANH TOÁN HÓA ĐƠN */}
        {/* ========================================================= */}
        {mode === 'bill_payment' && (
          <div className="h-full flex flex-col bg-slate-50">
            {step === 0 && (
              <>
                <AppHeader title="THANH TOÁN HÓA ĐƠN" onBack={() => setMode('home')} />
                <div className="p-6 flex-1 overflow-y-auto">
                  
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-slate-500 mb-2">LOẠI DỊCH VỤ</label>
                    <select 
                      value={billInfo.provider}
                      onChange={(e) => { setBillInfo({...billInfo, provider: e.target.value}); setIsBillFetched(false); }}
                      className="w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                    >
                      <option value="Điện lực EVN">⚡ Hóa đơn Tiền Điện (EVN)</option>
                      <option value="Cấp nước sạch">💧 Hóa đơn Tiền Nước</option>
                      <option value="Internet VNPT/FPT">🌐 Cước Internet / Truyền hình</option>
                    </select>
                  </div>

                  <div className="mb-6">
                    <label className="block text-xs font-bold text-slate-500 mb-2">MÃ KHÁCH HÀNG</label>
                    <input 
                      type="text" 
                      value={billInfo.customerCode} 
                      onChange={(e) => { setBillInfo({...billInfo, customerCode: e.target.value.toUpperCase()}); setIsBillFetched(false); }} 
                      className="w-full p-4 bg-white border border-slate-200 rounded-xl text-lg outline-none focus:border-blue-500 font-bold text-slate-800 uppercase" 
                      placeholder="VD: PE012345678" 
                    />
                  </div>
                  
                  {!isBillFetched ? (
                    <button 
                      onClick={() => { 
                        if (!billInfo.customerCode) return alert("Vui lòng nhập Mã khách hàng!");
                        // Giả lập tra cứu hệ thống: Random ra cục nợ từ 100k -> 500k
                        const randomAmount = Math.floor(Math.random() * 400000) + 100000;
                        setBillInfo({...billInfo, amount: randomAmount});
                        setIsBillFetched(true);
                        setErrorMessage('');
                      }} 
                      className="w-full py-4 bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold rounded-xl shadow-sm text-sm transition-all"
                    >
                      TRA CỨU HÓA ĐƠN
                    </button>
                  ) : (
                    <div className="animate-fade-in mt-2">
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                        <p className="text-xs text-slate-500 mb-1">Kỳ cước: Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</p>
                        <p className="text-sm font-bold text-slate-800 mb-3">{billInfo.provider} - Khách hàng: {billInfo.customerCode}</p>
                        <div className="flex justify-between items-end border-t border-slate-100 pt-3">
                          <span className="text-xs font-bold text-slate-500">Cần thanh toán:</span>
                          <span className="text-2xl font-black text-red-500">{billInfo.amount.toLocaleString()} đ</span>
                        </div>
                      </div>

                      {errorMessage && <p className="text-red-500 text-xs font-semibold mb-4 text-center">{errorMessage}</p>}
                      
                      <button 
                        onClick={() => {
                          if (billInfo.amount > currentUser.balance) return alert("Số dư khả dụng không đủ để thanh toán!");
                          setStep(1); setErrorMessage('');
                        }}
                        className="w-full py-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-lg text-sm transition-all"
                      >
                        THANH TOÁN BẰNG FACE ID
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {step === 1 && (
              <FaceAuthCamera 
                title="XÁC THỰC THANH TOÁN" 
                desc={`Ký số giao dịch thanh toán hóa đơn ${billInfo.amount.toLocaleString()}đ`} 
                btnText="XÁC NHẬN TRẢ TIỀN" 
                onConfirm={handleBillPaymentAuth} 
                loadText="ĐANG THANH TOÁN..." 
                onBack={() => setStep(0)} 
              />
            )}

            {step === 2 && (
              <>
                <AppHeader title="BIÊN LAI GIAO DỊCH" onBack={() => {setMode('home'); setStep(0);}} />
                <div className="p-8 text-center flex-1 flex flex-col justify-center">
                  <div className="w-20 h-20 bg-teal-500 text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg shadow-teal-500/30">
                    🧾
                  </div>
                  <h2 className="text-teal-600 font-bold text-xl mb-1">GẠCH NỢ THÀNH CÔNG</h2>
                  <p className="text-slate-400 text-xs mb-6">{new Date().toLocaleString('vi-VN')}</p>
                  <h1 className="text-3xl font-black text-slate-800 mb-2">{billInfo.amount.toLocaleString()} VND</h1>
                  <p className="text-xs font-semibold text-slate-500 mb-10">Dịch vụ: <span className="text-slate-800 font-bold">{billInfo.provider}</span></p>
                  <button onClick={() => {setMode('home'); setStep(0);}} className="w-full py-4 bg-blue-700 text-white font-bold rounded-xl shadow-md text-sm">
                    QUAY VỀ TRANG CHỦ
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* THÊM MỚI: LUỒNG QUẢN LÝ THẺ VISA */}
        {/* ========================================================= */}
        {mode === 'card_manage' && (
          <div className="h-full flex flex-col bg-slate-50">
            {step === 0 && (
              <>
                <AppHeader title="QUẢN LÝ THẺ" onBack={() => setMode('home')} />
                <div className="p-6 flex-1 overflow-y-auto">
                  
                  {/* GIAO DIỆN CHIẾC THẺ VISA */}
                  <div className={`relative h-[220px] rounded-2xl p-6 text-white shadow-2xl transition-all duration-700 mb-8 overflow-hidden ${isCardLocked ? 'bg-gradient-to-br from-slate-600 to-slate-800 scale-95 opacity-90' : 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 scale-100'}`}>
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/20 rounded-full blur-2xl"></div>
                    
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-2">
                          <svg className="w-10 h-8 text-yellow-300 opacity-90" viewBox="0 0 40 32" fill="currentColor">
                            <rect width="40" height="32" rx="6" fill="#FCD34D"/>
                            <path d="M0 10h12v12H0V10zm28 0h12v12H28V10zm-14 0h12v12H14V10z" fill="#D97706" opacity="0.4"/>
                            <path d="M10 0v32M30 0v32M0 16h40" stroke="#D97706" strokeWidth="1.5" opacity="0.4"/>
                          </svg>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white/80 transform rotate-90">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.106-.53-.106a.75.75 0 01.106-1.492h.848a.75.75 0 01.106 1.492z" />
                          </svg>
                        </div>
                        <span className="font-black italic text-2xl tracking-wider select-none drop-shadow-md">VISA</span>
                      </div>

                      <div>
                        <p className="font-mono text-xl tracking-[0.25em] mb-2 drop-shadow-md opacity-90">
                          4200 1234 {currentUser?.accountNumber.substring(0, 4) || '5678'} 9012
                        </p>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[9px] uppercase tracking-widest opacity-60 mb-1">Card Holder</p>
                            <p className="font-bold tracking-widest uppercase text-sm drop-shadow-md">{currentUser?.fullname}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] uppercase tracking-widest opacity-60 mb-1">Expires</p>
                            <p className="font-bold tracking-widest text-sm drop-shadow-md">12/28</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {isCardLocked && (
                      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-20">
                        <div className="bg-red-500 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-red-400 shadow-lg flex items-center gap-2">
                          <span>🔒</span> ĐÃ KHÓA THẺ
                        </div>
                      </div>
                    )}
                  </div>

                  {/* KHU VỰC ĐIỀU KHIỂN */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm mb-1">Trạng thái thẻ</h3>
                      <p className="text-xs text-slate-500">Khóa thẻ nếu nghi ngờ lộ thông tin</p>
                    </div>

                    <button 
                      onClick={() => {
                        const action = isCardLocked ? 'unlock' : 'lock';
                        setTargetCardAction(action);
                        setStep(1); 
                      }}
                      className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${isCardLocked ? 'bg-slate-300' : 'bg-emerald-500'}`}
                    >
                      <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform duration-300 shadow-md ${isCardLocked ? 'translate-x-1' : 'translate-x-7'}`} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {step === 1 && (
              <FaceAuthCamera 
                title="BẢO MẬT THẺ" 
                desc={`Vui lòng xác thực khuôn mặt để ${targetCardAction === 'lock' ? 'KHÓA' : 'MỞ'} thẻ VISA`} 
                btnText="XÁC NHẬN" 
                onConfirm={handleCardToggleAuth} 
                loadText="ĐANG KIỂM TRA..." 
                onBack={() => setStep(0)} 
              />
            )}

            {step === 2 && (
              <>
                <AppHeader title="THÀNH CÔNG" onBack={() => {setMode('card_manage'); setStep(0);}} />
                <div className="p-8 text-center flex-1 flex flex-col justify-center">
                  <div className={`w-24 h-24 text-white rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg ${isCardLocked ? 'bg-slate-600 shadow-slate-600/30' : 'bg-emerald-500 shadow-emerald-500/30'}`}>
                    {isCardLocked ? '🔒' : '🔓'}
                  </div>
                  <h2 className={`font-black text-2xl mb-2 uppercase ${isCardLocked ? 'text-slate-700' : 'text-emerald-600'}`}>
                    {isCardLocked ? 'ĐÃ KHÓA THẺ' : 'THẺ ĐANG HOẠT ĐỘNG'}
                  </h2>
                  <p className="text-slate-500 text-sm mb-10 px-4">
                    {isCardLocked 
                      ? 'Thẻ VISA của bạn đã bị khóa tạm thời. Mọi giao dịch sẽ bị từ chối.' 
                      : 'Thẻ VISA đã được mở khóa. Bạn có thể tiếp tục thanh toán trực tuyến.'}
                  </p>
                  <button onClick={() => {setMode('card_manage'); setStep(0);}} className="w-full py-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-md text-sm transition-all">
                    ĐÓNG
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
            currentUser={currentUser} 
            logo={vnuShieldLogo}
            onLogout={handleLogout} 
            onGoToUpdateFace={() => { setMode('update_face'); setStep(1); setErrorMessage(''); }} // <-- THÊM DÒNG NÀY
          />
        )}

        {/* CẬP NHẬT: THANH MENU BOTTOM NAV (Hiển thị thêm khi topup ở bước 0) */}
        {(mode === 'home' || mode === 'qr' || mode === 'history' || mode === 'profile' || (mode === 'transfer' && step === 0) || (mode === 'topup' && step === 0) || (mode === 'card_manage' && step === 0)) && (
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
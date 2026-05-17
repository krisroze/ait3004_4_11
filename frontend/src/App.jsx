import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

function App() {
  const webcamRef = useRef(null);
  
 
  const [step, setStep] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

 
  const [transactionInfo, setTransactionInfo] = useState({
    recipientName: '',
    recipientBank: 'Vietcombank',
    accountNumber: '',
    amount: '',
    content: '',
    time: ''
  });


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTransactionInfo({ ...transactionInfo, [name]: value });
  };

  
  const goToFaceAuth = () => {
    if (!transactionInfo.recipientName || !transactionInfo.amount) {
      alert("Vui lòng nhập Tên người nhận và Số tiền!");
      return;
    }
    setStep(1);
  };

  const handleFaceAuth = async () => {
    setErrorMessage('');
    setIsLoading(true);
    
    
    const imageBase64 = webcamRef.current.getScreenshot();

    if (!imageBase64) {
      setErrorMessage('❌ Không thể kết nối Camera. Vui lòng kiểm tra lại!');
      setIsLoading(false);
      return;
    }

    try {
      
      const response = await axios.post('http://127.0.0.1:8000/api/verify-face', {
        recipientName: transactionInfo.recipientName,
        accountNumber: transactionInfo.accountNumber,
        amount: transactionInfo.amount,
        image_data: imageBase64 
      });

      
      if (response.data.status === 'success') {
        
        
        const timeNow = response.data.transaction_time || new Date().toLocaleString('vi-VN');
        setTransactionInfo({ ...transactionInfo, time: timeNow });
        
        
        setStep(2); 
      } else {
        
        setErrorMessage('❌ ' + (response.data.message || 'Khuôn mặt không khớp!'));
      }

    } catch (error) {
      
      console.error("Chi tiết lỗi API:", error);
      
      
      if (error.code === 'ERR_NETWORK') {
        setErrorMessage('❌ Lỗi kết nối: Backend chưa chạy hoặc bị lỗi CORS!');
      } else {
        setErrorMessage('❌ Đã xảy ra lỗi máy chủ. Vui lòng thử lại!');
      }
    } finally {
      setIsLoading(false); 
    }
  };

  
  if (step === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.mainCard}>
          <h2 style={styles.header}>TẠO LỆNH CHUYỂN TIỀN</h2>
          <div style={styles.formGroup}>
            <label style={styles.label}>Tên người nhận:</label>
            <input name="recipientName" value={transactionInfo.recipientName} onChange={handleInputChange} style={styles.input} placeholder="VD: NGUYEN VAN A" />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Ngân hàng:</label>
            <select name="recipientBank" value={transactionInfo.recipientBank} onChange={handleInputChange} style={styles.input}>
              <option value="Vietcombank">Vietcombank</option>
              <option value="Techcombank">Techcombank</option>
              <option value="MB Bank">MB Bank</option>
              <option value="TPBank">TPBank</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Số tài khoản:</label>
            <input name="accountNumber" value={transactionInfo.accountNumber} onChange={handleInputChange} style={styles.input} placeholder="Nhập số tài khoản" />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Số tiền (VND):</label>
            <input name="amount" type="number" value={transactionInfo.amount} onChange={handleInputChange} style={styles.input} placeholder="VD: 500000" />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Nội dung chuyển khoản:</label>
            <input name="content" value={transactionInfo.content} onChange={handleInputChange} style={styles.input} placeholder="VD: Thanh toan tien an" />
          </div>
          <button onClick={goToFaceAuth} style={{...styles.button, backgroundColor: '#3498db'}}>
            TIẾP TỤC XÁC THỰC
          </button>
        </div>
      </div>
    );
  }

  
  if (step === 2) {
    return (
      <div style={styles.container}>
        <div style={styles.receiptCard}>
          <div style={styles.successIcon}>✓</div>
          <h2 style={{color: '#2ecc71', textAlign: 'center'}}>CHUYỂN TIỀN THÀNH CÔNG</h2>
          <h1 style={{textAlign: 'center', margin: '10px 0'}}>{Number(transactionInfo.amount).toLocaleString()} VND</h1>
          
          <div style={styles.receiptDetails}>
            <p><strong>Người nhận:</strong> <span style={styles.uppercase}>{transactionInfo.recipientName}</span></p>
            <p><strong>Ngân hàng:</strong> {transactionInfo.recipientBank}</p>
            <p><strong>Số tài khoản:</strong> {transactionInfo.accountNumber}</p>
            <p><strong>Nội dung:</strong> {transactionInfo.content}</p>
            <p><strong>Thời gian:</strong> {transactionInfo.time}</p>
            <p><strong>Xác thực bởi:</strong> Hệ thống AI Face ID</p>
          </div>
          
          <button 
            onClick={() => {
              setTransactionInfo({recipientName: '', recipientBank: 'Vietcombank', accountNumber: '', amount: '', content: '', time: ''});
              setStep(0);
            }} 
            style={{...styles.button, backgroundColor: '#3498db', marginTop: '20px', width: '100%'}}
          >
            VỀ TRANG CHỦ MỚI
          </button>
        </div>
      </div>
    );
  }

 
  return (
    <div style={styles.container}>
      <div style={styles.mainCard}>
        <h2 style={styles.header}>XÁC NHẬN GIAO DỊCH</h2>
        <div style={styles.infoBox}>
          <div style={styles.infoRow}>
            <span style={styles.label}>Chuyển tiền tới:</span>
            <span style={styles.valueHighlight}>{transactionInfo.recipientName.toUpperCase()}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Ngân hàng:</span>
            <span style={styles.value}>{transactionInfo.recipientBank}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.label}>Số tiền:</span>
            <span style={styles.valueHighlight}>{Number(transactionInfo.amount).toLocaleString()} VND</span>
          </div>
        </div>

        <div style={styles.authSection}>
          <p style={styles.authText}>Vui lòng đưa khuôn mặt vào khung hình để xác thực thay cho mã OTP</p>
          <div style={styles.cameraFrame}>
            <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" style={styles.webcam} />
            {isLoading && <div style={styles.scanningOverlay}>ĐANG XÁC THỰC AI...</div>}
          </div>
          {errorMessage && <p style={styles.errorText}>{errorMessage}</p>}
          <button onClick={handleFaceAuth} disabled={isLoading} style={{...styles.button, backgroundColor: isLoading ? '#bdc3c7' : '#9b59b6'}}>
            {isLoading ? 'ĐANG XỬ LÝ...' : 'XÁC THỰC & CHUYỂN TIỀN'}
          </button>
          <button onClick={() => setStep(0)} style={{...styles.button, backgroundColor: '#95a5a6', marginTop: '10px'}}>
            QUAY LẠI SỬA THÔNG TIN
          </button>
        </div>
      </div>
    </div>
  );
}


const styles = {
  container: { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif', backgroundColor: '#ecf0f1', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
  mainCard: { backgroundColor: '#fff', width: '100%', maxWidth: '450px', borderRadius: '15px', padding: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  header: { textAlign: 'center', color: '#2c3e50', marginTop: '0', borderBottom: '2px solid #eee', paddingBottom: '15px' },
  
  // Dành cho Form nhập liệu
  formGroup: { marginBottom: '15px' },
  input: { width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '15px' },
  
  infoBox: { backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #e9ecef' },
  infoRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '15px' },
  label: { color: '#7f8c8d', fontWeight: '500' },
  value: { color: '#2c3e50', fontWeight: '500' },
  valueHighlight: { color: '#e74c3c', fontWeight: 'bold', fontSize: '16px' },
  uppercase: { textTransform: 'uppercase' },
  
  authSection: { textAlign: 'center' },
  authText: { color: '#34495e', fontSize: '14px', marginBottom: '15px' },
  cameraFrame: { position: 'relative', width: '280px', height: '280px', margin: '0 auto', borderRadius: '50%', overflow: 'hidden', border: '5px solid #9b59b6', boxShadow: '0 5px 15px rgba(155, 89, 182, 0.3)' },
  webcam: { width: '100%', height: '100%', objectFit: 'cover' },
  scanningOverlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(155, 89, 182, 0.8)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '18px', animation: 'pulse 1s infinite' },
  
  button: { width: '100%', padding: '15px', marginTop: '20px', border: 'none', borderRadius: '8px', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.3s' },
  errorText: { color: '#e74c3c', marginTop: '15px', fontWeight: 'bold' },

  receiptCard: { backgroundColor: '#fff', width: '100%', maxWidth: '400px', borderRadius: '15px', padding: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' },
  successIcon: { width: '60px', height: '60px', backgroundColor: '#2ecc71', color: 'white', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '30px', margin: '0 auto 15px auto' },
  receiptDetails: { backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '10px', marginTop: '20px', fontSize: '14px', color: '#34495e', lineHeight: '1.8' }
};

export default App;
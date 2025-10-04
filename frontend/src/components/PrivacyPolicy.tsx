import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div style={{
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      lineHeight: '1.6',
      color: '#333',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '15px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
          color: 'white',
          padding: '40px 30px',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '2.5em',
            marginBottom: '10px',
            fontWeight: '700'
          }}>
            🔒 นโยบายความเป็นส่วนตัว
          </h1>
          <p style={{
            fontSize: '1.1em',
            opacity: '0.9'
          }}>
            Sodeclick - แพลตฟอร์มหาคู่ที่ปลอดภัยและเชื่อถือได้
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '40px 30px' }}>
          {/* Section 1 */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              color: '#2c3e50',
              fontSize: '1.5em',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #3498db'
            }}>
              1. ข้อมูลที่เรารวบรวม
            </h2>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              1.1 ข้อมูลส่วนบุคคล
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li><strong>ข้อมูลบัญชี:</strong> ชื่อ, นามสกุล, อีเมล, เบอร์โทรศัพท์, วันเกิด</li>
              <li><strong>ข้อมูลโปรไฟล์:</strong> รูปภาพ, ข้อมูลส่วนตัว, ความสนใจ, งานอดิเรก</li>
              <li><strong>ข้อมูลตำแหน่ง:</strong> ที่อยู่, จังหวัด, พิกัด GPS (เมื่อได้รับอนุญาต)</li>
              <li><strong>ข้อมูลการใช้งาน:</strong> ประวัติการแชท, การโหวต, การซื้อสินค้า</li>
            </ul>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              1.2 ข้อมูลเทคนิค
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li><strong>ข้อมูลอุปกรณ์:</strong> ประเภทอุปกรณ์, ระบบปฏิบัติการ, เวอร์ชันแอป</li>
              <li><strong>ข้อมูลเครือข่าย:</strong> IP Address, ประเภทการเชื่อมต่อ</li>
              <li><strong>ข้อมูลการใช้งาน:</strong> เวลาที่ใช้งาน, หน้าที่เข้าชม, การคลิก</li>
              <li><strong>Cookies และ Local Storage:</strong> ข้อมูลการตั้งค่าและเซสชัน</li>
            </ul>
          </div>

          {/* Section 2 */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              color: '#2c3e50',
              fontSize: '1.5em',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #3498db'
            }}>
              2. วิธีการรวบรวมข้อมูล
            </h2>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              2.1 ข้อมูลที่คุณให้โดยตรง
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>การลงทะเบียนและสร้างบัญชี</li>
              <li>การอัปเดตโปรไฟล์และข้อมูลส่วนตัว</li>
              <li>การส่งข้อความและการสื่อสาร</li>
              <li>การเข้าร่วมกิจกรรมและการโหวต</li>
            </ul>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              2.2 ข้อมูลที่รวบรวมอัตโนมัติ
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>ข้อมูลการใช้งานแอปพลิเคชัน</li>
              <li>ข้อมูลการเชื่อมต่อและประสิทธิภาพ</li>
              <li>ข้อมูลตำแหน่ง (เมื่อได้รับอนุญาต)</li>
              <li>ข้อมูลการวิเคราะห์และสถิติ</li>
            </ul>
          </div>

          {/* Section 3 */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              color: '#2c3e50',
              fontSize: '1.5em',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #3498db'
            }}>
              3. วัตถุประสงค์ในการใช้ข้อมูล
            </h2>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              3.1 การให้บริการ
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>การจับคู่และแนะนำผู้ใช้ที่เหมาะสม</li>
              <li>การให้บริการแชทและการสื่อสาร</li>
              <li>การจัดการระบบสมาชิกและชำระเงิน</li>
              <li>การให้บริการของขวัญและเหรียญ</li>
            </ul>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              3.2 การปรับปรุงบริการ
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>การวิเคราะห์และพัฒนาฟีเจอร์ใหม่</li>
              <li>การปรับปรุงประสบการณ์ผู้ใช้</li>
              <li>การป้องกันการใช้งานที่ผิดกฎหมาย</li>
              <li>การให้การสนับสนุนลูกค้า</li>
            </ul>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              3.3 การตลาดและการสื่อสาร
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>การส่งข้อมูลโปรโมชั่นและข่าวสาร</li>
              <li>การแนะนำฟีเจอร์ใหม่</li>
              <li>การสำรวจความพึงพอใจ</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              color: '#2c3e50',
              fontSize: '1.5em',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #3498db'
            }}>
              4. การแบ่งปันข้อมูล
            </h2>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              4.1 การแบ่งปันภายในแพลตฟอร์ม
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>ข้อมูลโปรไฟล์ที่คุณเลือกแสดงต่อสาธารณะ</li>
              <li>ข้อมูลการโหวตและคะแนน (ไม่ระบุตัวตน)</li>
              <li>ข้อมูลสถิติการใช้งาน (แบบรวม)</li>
            </ul>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              4.2 การแบ่งปันกับบุคคลที่สาม
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li><strong>ผู้ให้บริการชำระเงิน:</strong> Rabbit Gateway สำหรับการประมวลผลการชำระเงิน</li>
              <li><strong>ผู้ให้บริการคลาวด์:</strong> Google Cloud, MongoDB Atlas สำหรับการจัดเก็บข้อมูล</li>
              <li><strong>ผู้ให้บริการวิเคราะห์:</strong> Google Analytics สำหรับการวิเคราะห์การใช้งาน</li>
              <li><strong>หน่วยงานราชการ:</strong> เมื่อมีคำสั่งศาลหรือกฎหมายบังคับ</li>
            </ul>

            <div style={{
              background: '#f8f9fa',
              padding: '15px',
              borderLeft: '4px solid #3498db',
              margin: '15px 0',
              borderRadius: '5px'
            }}>
              <strong>หมายเหตุ:</strong> เราไม่ขายข้อมูลส่วนบุคคลของคุณให้กับบุคคลที่สามเพื่อวัตถุประสงค์ทางการตลาด
            </div>
          </div>

          {/* Section 5 */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              color: '#2c3e50',
              fontSize: '1.5em',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #3498db'
            }}>
              5. การรักษาความปลอดภัยข้อมูล
            </h2>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              5.1 การเข้ารหัสข้อมูล
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>การเข้ารหัสข้อมูลในขณะส่งผ่าน (SSL/TLS)</li>
              <li>การเข้ารหัสข้อมูลในฐานข้อมูล</li>
              <li>การเข้ารหัสรหัสผ่านด้วย bcrypt</li>
            </ul>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              5.2 การควบคุมการเข้าถึง
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>ระบบยืนยันตัวตนแบบหลายขั้นตอน</li>
              <li>การจำกัดการเข้าถึงตามบทบาท</li>
              <li>การตรวจสอบและบันทึกการเข้าถึง</li>
            </ul>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              5.3 การสำรองข้อมูล
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>การสำรองข้อมูลเป็นประจำ</li>
              <li>การทดสอบการกู้คืนข้อมูล</li>
              <li>การจัดเก็บข้อมูลในหลายสถานที่</li>
            </ul>
          </div>

          {/* Section 6 */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              color: '#2c3e50',
              fontSize: '1.5em',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #3498db'
            }}>
              6. สิทธิ์ของคุณ
            </h2>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              6.1 สิทธิ์ในการเข้าถึงและแก้ไข
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>ดูข้อมูลส่วนบุคคลที่เรามี</li>
              <li>แก้ไขข้อมูลที่ไม่ถูกต้อง</li>
              <li>อัปเดตข้อมูลส่วนตัว</li>
            </ul>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              6.2 สิทธิ์ในการลบข้อมูล
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>ลบบัญชีและข้อมูลส่วนบุคคล</li>
              <li>ลบข้อมูลการใช้งาน</li>
              <li>ยกเลิกการสมัครสมาชิก</li>
            </ul>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              6.3 สิทธิ์ในการควบคุมข้อมูล
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>เลือกไม่รับข้อมูลการตลาด</li>
              <li>ควบคุมการแชร์ข้อมูล</li>
              <li>ขอสำเนาข้อมูล</li>
            </ul>
          </div>

          {/* Section 7 */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              color: '#2c3e50',
              fontSize: '1.5em',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #3498db'
            }}>
              7. การใช้ Cookies
            </h2>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              7.1 ประเภทของ Cookies
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li><strong>Essential Cookies:</strong> จำเป็นสำหรับการทำงานของแอป</li>
              <li><strong>Performance Cookies:</strong> เก็บข้อมูลการใช้งานเพื่อปรับปรุงประสิทธิภาพ</li>
              <li><strong>Functional Cookies:</strong> จำการตั้งค่าและความชอบของคุณ</li>
              <li><strong>Marketing Cookies:</strong> ใช้สำหรับการโฆษณาและการตลาด</li>
            </ul>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              7.2 การจัดการ Cookies
            </h3>
            <p style={{ marginBottom: '10px', textAlign: 'justify' }}>
              คุณสามารถจัดการ Cookies ผ่านการตั้งค่าเบราว์เซอร์หรือแอปพลิเคชันของเรา
            </p>
          </div>

          {/* Section 8 */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              color: '#2c3e50',
              fontSize: '1.5em',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #3498db'
            }}>
              8. การเก็บรักษาข้อมูล
            </h2>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              8.1 ระยะเวลาการเก็บรักษา
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li><strong>ข้อมูลบัญชี:</strong> จนกว่าคุณจะลบบัญชี</li>
              <li><strong>ข้อมูลการใช้งาน:</strong> 2 ปีหลังจากใช้งานครั้งสุดท้าย</li>
              <li><strong>ข้อมูลการชำระเงิน:</strong> 7 ปีตามกฎหมาย</li>
              <li><strong>ข้อมูลการสนับสนุน:</strong> 3 ปีหลังจากปิดเคส</li>
            </ul>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              8.2 การลบข้อมูล
            </h3>
            <p style={{ marginBottom: '10px', textAlign: 'justify' }}>
              เมื่อครบกำหนดหรือเมื่อคุณร้องขอ เราจะลบข้อมูลของคุณอย่างปลอดภัย
            </p>
          </div>

          {/* Section 9 */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              color: '#2c3e50',
              fontSize: '1.5em',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #3498db'
            }}>
              9. การโอนย้ายข้อมูล
            </h2>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              9.1 การโอนย้ายระหว่างประเทศ
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>ข้อมูลอาจถูกโอนไปยังประเทศอื่นเพื่อการประมวลผล</li>
              <li>เราจะรับประกันว่ามีมาตรการคุ้มครองที่เหมาะสม</li>
              <li>การโอนย้ายจะทำตามกฎหมายคุ้มครองข้อมูลส่วนบุคคล</li>
            </ul>
          </div>

          {/* Section 10 */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              color: '#2c3e50',
              fontSize: '1.5em',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #3498db'
            }}>
              10. การเปลี่ยนแปลงนโยบาย
            </h2>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              10.1 การแจ้งเตือนการเปลี่ยนแปลง
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>เราจะแจ้งการเปลี่ยนแปลงล่วงหน้า 30 วัน</li>
              <li>การแจ้งเตือนผ่านแอปพลิเคชันและอีเมล</li>
              <li>การเปลี่ยนแปลงสำคัญจะต้องได้รับความยินยอม</li>
            </ul>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              10.2 การยอมรับการเปลี่ยนแปลง
            </h3>
            <p style={{ marginBottom: '10px', textAlign: 'justify' }}>
              การใช้งานต่อเนื่องถือเป็นการยอมรับนโยบายใหม่
            </p>
          </div>

          {/* Section 11 */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              color: '#2c3e50',
              fontSize: '1.5em',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #3498db'
            }}>
              11. การคุ้มครองผู้เยาว์
            </h2>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              11.1 ข้อจำกัดอายุ
            </h3>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>แอปพลิเคชันนี้สำหรับผู้ที่มีอายุ 18 ปีขึ้นไป</li>
              <li>เราไม่เก็บข้อมูลจากผู้เยาว์โดยเจตนา</li>
              <li>หากพบข้อมูลผู้เยาว์จะลบทันที</li>
            </ul>

            <h3 style={{
              color: '#34495e',
              fontSize: '1.2em',
              margin: '20px 0 10px 0'
            }}>
              11.2 การตรวจสอบอายุ
            </h3>
            <p style={{ marginBottom: '10px', textAlign: 'justify' }}>
              เรามีระบบตรวจสอบอายุและเอกสารยืนยันตัวตน
            </p>
          </div>

          {/* Contact Info */}
          <div style={{
            background: '#ecf0f1',
            padding: '20px',
            borderRadius: '10px',
            marginTop: '30px'
          }}>
            <h3 style={{
              color: '#2c3e50',
              marginBottom: '15px'
            }}>
              📞 ติดต่อเรา
            </h3>
            <p><strong>หากคุณมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัวนี้ กรุณาติดต่อ:</strong></p>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li><strong>อีเมล:</strong> privacy@sodeclick.com</li>
              <li><strong>เบอร์โทรศัพท์:</strong> 02-XXX-XXXX</li>
              <li><strong>ที่อยู่:</strong> กรุงเทพมหานคร, ประเทศไทย</li>
              <li><strong>เวลาทำการ:</strong> จันทร์-ศุกร์ 9:00-18:00 น.</li>
            </ul>

            <p><strong>สำหรับการร้องขอข้อมูลส่วนบุคคล:</strong></p>
            <ul style={{ marginLeft: '20px', marginBottom: '15px' }}>
              <li>กรุณาส่งอีเมลมาที่: data-request@sodeclick.com</li>
              <li>เราจะตอบกลับภายใน 30 วัน</li>
            </ul>
          </div>

          {/* Section 12 */}
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{
              color: '#2c3e50',
              fontSize: '1.5em',
              marginBottom: '15px',
              paddingBottom: '10px',
              borderBottom: '2px solid #3498db'
            }}>
              12. กฎหมายที่ใช้บังคับ
            </h2>
            <p style={{ marginBottom: '10px', textAlign: 'justify' }}>
              นโยบายนี้อยู่ภายใต้กฎหมายคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 และกฎหมายที่เกี่ยวข้องของประเทศไทย
            </p>
          </div>

          {/* Back Button */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={handleBackToHome}
              style={{
                display: 'inline-block',
                background: '#3498db',
                color: 'white',
                padding: '12px 25px',
                textDecoration: 'none',
                borderRadius: '25px',
                marginTop: '20px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#2980b9';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#3498db';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              ← กลับสู่หน้าแรก
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: '#2c3e50',
          color: 'white',
          textAlign: 'center',
          padding: '20px',
          fontSize: '0.9em'
        }}>
          <p>© 2024 Sodeclick. สงวนลิขสิทธิ์ทั้งหมด</p>
          <p>นโยบายความเป็นส่วนตัวนี้มีผลบังคับใช้ตั้งแต่วันที่ 1 มกราคม 2024</p>
          <p>อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH')}</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;

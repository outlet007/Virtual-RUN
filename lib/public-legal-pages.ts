export type BilingualText = {
  th: string;
  en: string;
};

export type PublicLegalSection = {
  id: string;
  title: BilingualText;
  paragraphs?: BilingualText[];
  bullets?: BilingualText[];
  showContact?: boolean;
};

export type PublicLegalDocument = {
  slug: "privacy" | "terms" | "data-deletion";
  title: BilingualText;
  summary: BilingualText;
  sections: PublicLegalSection[];
};

export const LEGAL_LAST_UPDATED: BilingualText = {
  th: "11 กันยายน 2569",
  en: "11 September 2026",
};

export const PUBLIC_LEGAL_PATHS = {
  privacy: "/privacy",
  terms: "/terms",
  dataDeletion: "/data-deletion",
} as const;

export function normalizePrivacyContactEmail(value: string | null | undefined) {
  const email = value?.trim() ?? "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export const PRIVACY_NOTICE: PublicLegalDocument = {
  slug: "privacy",
  title: {
    th: "นโยบายความเป็นส่วนตัว",
    en: "Privacy Notice",
  },
  summary: {
    th: "นโยบายนี้อธิบายว่าระบบ Virtual RUN เก็บ ใช้ เปิดเผย เก็บรักษา และคุ้มครองข้อมูลส่วนบุคคลของผู้ใช้อย่างไร",
    en: "This notice explains how Virtual RUN collects, uses, discloses, retains, and protects users' personal data.",
  },
  sections: [
    {
      id: "controller-and-scope",
      title: { th: "1. ผู้ให้บริการและขอบเขต", en: "1. Service Operator and Scope" },
      paragraphs: [
        {
          th: "Virtual RUN เป็นระบบสำหรับสมัครกิจกรรมวิ่ง บันทึกและตรวจสอบผลการวิ่ง สะสมคะแนนและเหรียญ รวมถึงจัดส่งของรางวัล โดยผู้ดูแลระบบ Virtual RUN ของมหาวิทยาลัยกรุงเทพเป็นผู้รับผิดชอบการดำเนินงานและการจัดการข้อมูลภายในระบบ",
          en: "Virtual RUN supports event registration, activity recording and verification, points and medals, and reward delivery. The Virtual RUN administrator for Bangkok University is responsible for operating the service and managing data within it.",
        },
      ],
    },
    {
      id: "data-collected",
      title: { th: "2. ข้อมูลที่เราเก็บรวบรวม", en: "2. Personal Data We Collect" },
      bullets: [
        {
          th: "ข้อมูลบัญชีและโปรไฟล์ เช่น ชื่อ อีเมล รูปประจำตัว และรหัสผู้ใช้จากผู้ให้บริการเข้าสู่ระบบ เช่น Google หรือ Facebook",
          en: "Account and profile data, such as name, email address, avatar, and identifiers from sign-in providers such as Google or Facebook.",
        },
        {
          th: "ข้อมูลกิจกรรมวิ่ง เช่น ระยะทาง วันที่ เวลา ผลการวิ่ง ไฟล์หรือรูปหลักฐาน และข้อมูลที่เชื่อมต่อจาก Strava เมื่อผู้ใช้อนุญาต",
          en: "Running activity data, including distance, date, time, results, uploaded evidence, and Strava data when the user authorizes the connection.",
        },
        {
          th: "ข้อมูลการสมัครกิจกรรม การชำระเงิน คะแนน เหรียญ รางวัล และข้อมูลจัดส่งที่ผู้ใช้ให้ไว้",
          en: "Event registrations, payments, points, medals, rewards, and delivery information supplied by the user.",
        },
        {
          th: "ข้อมูลทางเทคนิคที่จำเป็นต่อความปลอดภัยและการทำงานของระบบ เช่น คุกกี้ เซสชัน บันทึกเหตุการณ์ ที่อยู่ IP และข้อมูลอุปกรณ์",
          en: "Technical data required for security and service operation, such as cookies, sessions, event logs, IP addresses, and device information.",
        },
      ],
    },
    {
      id: "purposes",
      title: { th: "3. วัตถุประสงค์การใช้ข้อมูล", en: "3. How We Use Personal Data" },
      bullets: [
        {
          th: "สร้างและดูแลบัญชี ยืนยันตัวตน และป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต",
          en: "To create and maintain accounts, authenticate users, and prevent unauthorized access.",
        },
        {
          th: "ให้บริการกิจกรรมวิ่ง ตรวจสอบผล คำนวณระยะทาง คะแนน เหรียญ และสิทธิประโยชน์",
          en: "To operate running events, verify results, and calculate distances, points, medals, and benefits.",
        },
        {
          th: "ดำเนินการชำระเงิน จัดส่ง ติดต่อสื่อสาร แก้ไขปัญหา และปรับปรุงความปลอดภัยของบริการ",
          en: "To process payments and deliveries, communicate with users, resolve issues, and improve service security.",
        },
        {
          th: "ปฏิบัติตามกฎหมาย คำสั่งของหน่วยงานที่มีอำนาจ และข้อกำหนดที่เกี่ยวข้อง",
          en: "To comply with applicable laws, lawful authority requests, and relevant requirements.",
        },
      ],
    },
    {
      id: "sharing",
      title: { th: "4. การเปิดเผยและผู้ให้บริการภายนอก", en: "4. Sharing and Service Providers" },
      paragraphs: [
        {
          th: "ข้อมูลอาจถูกประมวลผลโดยผู้ให้บริการที่จำเป็นต่อการทำงานของระบบ เช่น ผู้ให้บริการโฮสติ้ง ฐานข้อมูล การเข้าสู่ระบบ การชำระเงิน การเชื่อมต่อกิจกรรม และการจัดส่ง ภายใต้ขอบเขตที่จำเป็นต่อการให้บริการ รวมทั้งอาจเปิดเผยเมื่อกฎหมายกำหนด",
          en: "Data may be processed by providers required to operate the service, including hosting, database, authentication, payment, activity-integration, and delivery providers, only as necessary to provide the service. Data may also be disclosed when required by law.",
        },
      ],
    },
    {
      id: "retention-security",
      title: { th: "5. การเก็บรักษาและความปลอดภัย", en: "5. Retention and Security" },
      paragraphs: [
        {
          th: "เราเก็บข้อมูลเท่าที่จำเป็นตามวัตถุประสงค์ของบริการ ระยะเวลาที่ผู้ดูแลกำหนด และหน้าที่ตามกฎหมาย ข้อมูลหลักฐานการวิ่งอาจถูกลบตามนโยบายการเก็บรักษาของระบบ เราใช้มาตรการด้านสิทธิการเข้าถึง การเข้ารหัส การบันทึกเหตุการณ์ และการสำรองข้อมูลตามความเหมาะสม",
          en: "We retain data only as needed for service purposes, administrator-defined retention periods, and legal obligations. Running evidence may be removed under the service's retention policy. We apply appropriate access controls, encryption, logging, and backup measures.",
        },
      ],
    },
    {
      id: "rights",
      title: { th: "6. สิทธิและการติดต่อ", en: "6. Your Rights and Contact" },
      paragraphs: [
        {
          th: "ภายใต้กฎหมายที่ใช้บังคับ ผู้ใช้อาจขอเข้าถึง แก้ไข โอน คัดค้าน จำกัด ถอนความยินยอม หรือลบข้อมูลส่วนบุคคล การดำเนินการบางอย่างอาจถูกจำกัดเมื่อจำเป็นต้องเก็บข้อมูลเพื่อปฏิบัติตามกฎหมาย ป้องกันการทุจริต หรือจัดการข้อพิพาท",
          en: "Subject to applicable law, users may request access, correction, portability, objection, restriction, withdrawal of consent, or deletion. Some actions may be limited where data must be retained for legal compliance, fraud prevention, or dispute handling.",
        },
      ],
      showContact: true,
    },
    {
      id: "updates",
      title: { th: "7. การปรับปรุงนโยบาย", en: "7. Updates to This Notice" },
      paragraphs: [
        {
          th: "เราอาจปรับปรุงนโยบายนี้เมื่อบริการหรือข้อกำหนดเปลี่ยนแปลง โดยจะแสดงวันที่ปรับปรุงล่าสุดบนหน้านี้",
          en: "We may update this notice when the service or applicable requirements change. The latest revision date will be shown on this page.",
        },
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: PublicLegalDocument = {
  slug: "terms",
  title: { th: "ข้อกำหนดการใช้บริการ", en: "Terms of Service" },
  summary: {
    th: "ข้อกำหนดนี้ใช้กับการสมัครสมาชิก การเข้าร่วมกิจกรรม และการใช้บริการทั้งหมดของ Virtual RUN",
    en: "These terms apply to account registration, event participation, and all use of Virtual RUN.",
  },
  sections: [
    {
      id: "acceptance",
      title: { th: "1. การยอมรับข้อกำหนด", en: "1. Acceptance of Terms" },
      paragraphs: [
        {
          th: "เมื่อสร้างบัญชี เข้าสู่ระบบ หรือใช้ Virtual RUN ผู้ใช้ตกลงปฏิบัติตามข้อกำหนดนี้ นโยบายความเป็นส่วนตัว และกติกาของแต่ละกิจกรรม หากไม่ยอมรับ โปรดหยุดใช้บริการ",
          en: "By creating an account, signing in, or using Virtual RUN, you agree to these terms, the Privacy Notice, and each event's rules. If you do not agree, please stop using the service.",
        },
      ],
    },
    {
      id: "accounts",
      title: { th: "2. บัญชีผู้ใช้", en: "2. User Accounts" },
      bullets: [
        {
          th: "ให้ข้อมูลที่ถูกต้องและเป็นปัจจุบัน และใช้บัญชีของตนเองเท่านั้น",
          en: "Provide accurate, current information and use only your own account.",
        },
        {
          th: "รักษาความปลอดภัยของรหัสผ่านและช่องทางเข้าสู่ระบบ และแจ้งผู้ดูแลเมื่อสงสัยว่าบัญชีถูกเข้าถึงโดยไม่ได้รับอนุญาต",
          en: "Protect passwords and sign-in methods, and notify the administrator if unauthorized access is suspected.",
        },
        {
          th: "ผู้เยาว์ควรได้รับความยินยอมจากผู้ปกครองตามที่กฎหมายกำหนดก่อนใช้บริการหรือเข้าร่วมกิจกรรม",
          en: "Minors should obtain guardian consent where required by applicable law before using the service or joining an event.",
        },
      ],
    },
    {
      id: "participation",
      title: { th: "3. การเข้าร่วมกิจกรรมและหลักฐาน", en: "3. Events and Activity Evidence" },
      paragraphs: [
        {
          th: "ผู้ใช้ต้องปฏิบัติตามช่วงเวลา ระยะทาง เงื่อนไขแพ็กเกจ และกติกาของกิจกรรม หลักฐานต้องเป็นข้อมูลจริงของผู้ใช้และไม่ถูกแก้ไขเพื่อทำให้เข้าใจผิด ผู้ดูแลอาจขอตรวจสอบเพิ่มเติม ปฏิเสธผล หรือเพิกถอนคะแนนและรางวัลเมื่อพบความผิดปกติ",
          en: "Users must follow event periods, distances, package conditions, and event rules. Evidence must reflect the user's genuine activity and must not be manipulated. Administrators may request further verification, reject results, or revoke points and rewards where irregularities are found.",
        },
      ],
    },
    {
      id: "payments-rewards",
      title: { th: "4. การชำระเงินและของรางวัล", en: "4. Payments and Rewards" },
      paragraphs: [
        {
          th: "ราคา สิทธิประโยชน์ เงื่อนไขการคืนเงิน และการจัดส่งเป็นไปตามรายละเอียดของแต่ละกิจกรรม ผู้ใช้ต้องตรวจสอบข้อมูลก่อนยืนยันรายการ ความล่าช้าที่เกิดจากข้อมูลจัดส่งไม่ครบถ้วนอาจต้องใช้เวลาแก้ไขเพิ่มเติม",
          en: "Prices, benefits, refund conditions, and delivery terms are governed by each event's details. Users must review information before confirmation. Incomplete delivery details may cause additional delays.",
        },
      ],
    },
    {
      id: "acceptable-use",
      title: { th: "5. การใช้งานที่ไม่อนุญาต", en: "5. Prohibited Use" },
      bullets: [
        {
          th: "ห้ามปลอมแปลงผลการวิ่ง ใช้ข้อมูลของผู้อื่น หรือพยายามรับสิทธิประโยชน์โดยมิชอบ",
          en: "Do not falsify activity results, use another person's data, or attempt to obtain benefits improperly.",
        },
        {
          th: "ห้ามโจมตี รบกวน หลีกเลี่ยงมาตรการความปลอดภัย เก็บข้อมูลอัตโนมัติโดยไม่ได้รับอนุญาต หรือใช้บริการในทางผิดกฎหมาย",
          en: "Do not attack or disrupt the service, bypass security controls, scrape data without authorization, or use the service unlawfully.",
        },
      ],
    },
    {
      id: "availability",
      title: { th: "6. ความพร้อมใช้งานและการเปลี่ยนแปลง", en: "6. Availability and Changes" },
      paragraphs: [
        {
          th: "บริการอาจหยุดชั่วคราวเพื่อบำรุงรักษา ความปลอดภัย หรือเหตุที่อยู่นอกเหนือการควบคุม ผู้ดูแลอาจปรับปรุงคุณสมบัติ กติกา หรือข้อกำหนด โดยจะแจ้งการเปลี่ยนแปลงที่มีนัยสำคัญผ่านช่องทางที่เหมาะสม",
          en: "The service may be temporarily unavailable for maintenance, security, or circumstances beyond reasonable control. Administrators may update features, rules, or terms and will communicate material changes through appropriate channels.",
        },
      ],
    },
    {
      id: "suspension",
      title: { th: "7. การระงับหรือยุติบัญชี", en: "7. Suspension or Termination" },
      paragraphs: [
        {
          th: "ผู้ดูแลอาจจำกัด ระงับ หรือยุติบัญชีที่ฝ่าฝืนข้อกำหนด กระทบความปลอดภัย หรือสร้างความเสียหายต่อผู้ใช้รายอื่น ผู้ใช้สามารถขอยุติบัญชีและลบข้อมูลตามหน้าคำแนะนำการลบข้อมูล",
          en: "Administrators may restrict, suspend, or terminate accounts that violate these terms, threaten security, or harm other users. Users may request account termination and data deletion through the Data Deletion Instructions page.",
        },
      ],
    },
    {
      id: "contact",
      title: { th: "8. การติดต่อ", en: "8. Contact" },
      paragraphs: [
        {
          th: "หากมีคำถามเกี่ยวกับข้อกำหนดนี้ โปรดติดต่อผู้ดูแล Virtual RUN",
          en: "For questions about these terms, please contact the Virtual RUN administrator.",
        },
      ],
      showContact: true,
    },
  ],
};

export const DATA_DELETION_INSTRUCTIONS: PublicLegalDocument = {
  slug: "data-deletion",
  title: { th: "คำแนะนำการลบข้อมูลผู้ใช้", en: "User Data Deletion Instructions" },
  summary: {
    th: "ผู้ใช้สามารถขอลบบัญชี Virtual RUN และข้อมูลที่เชื่อมโยงกับ Facebook หรือผู้ให้บริการเข้าสู่ระบบอื่นได้ตามขั้นตอนต่อไปนี้",
    en: "Users can request deletion of their Virtual RUN account and data linked to Facebook or another sign-in provider by following these steps.",
  },
  sections: [
    {
      id: "facebook-access",
      title: { th: "1. ถอนการเชื่อมต่อจาก Facebook", en: "1. Remove Facebook Access" },
      bullets: [
        {
          th: "เปิด Facebook แล้วไปที่ การตั้งค่าและความเป็นส่วนตัว > การตั้งค่า > แอพและเว็บไซต์",
          en: "Open Facebook and go to Settings & privacy > Settings > Apps and websites.",
        },
        {
          th: "เลือก BU Virtual RUN แล้วกดนำออก การดำเนินการนี้หยุดการเข้าถึงข้อมูลใหม่จาก Facebook แต่ไม่ลบข้อมูลที่บันทึกไว้ใน Virtual RUN โดยอัตโนมัติ",
          en: "Select BU Virtual RUN and choose Remove. This stops future Facebook access but does not automatically delete data already stored by Virtual RUN.",
        },
      ],
    },
    {
      id: "submit-request",
      title: { th: "2. ส่งคำขอลบบัญชีและข้อมูล", en: "2. Submit an Account and Data Deletion Request" },
      bullets: [
        {
          th: "ติดต่อผู้ดูแล Virtual RUN โดยใช้หัวข้อ “คำขอลบข้อมูล Virtual RUN”",
          en: "Contact the Virtual RUN administrator with the subject “Virtual RUN Data Deletion Request.”",
        },
        {
          th: "ระบุชื่อ อีเมลที่ใช้สมัคร และแจ้งว่าเข้าสู่ระบบด้วย Facebook, Google หรืออีเมล ห้ามส่งรหัสผ่าน App Secret หรือ access token",
          en: "Provide your name, registered email address, and whether you signed in with Facebook, Google, or email. Never send a password, App Secret, or access token.",
        },
        {
          th: "ผู้ดูแลอาจขอข้อมูลเพิ่มเติมเท่าที่จำเป็นเพื่อยืนยันว่าเจ้าของบัญชีเป็นผู้ส่งคำขอ",
          en: "The administrator may request limited additional information needed to verify account ownership.",
        },
      ],
      showContact: true,
    },
    {
      id: "processing",
      title: { th: "3. สิ่งที่จะเกิดขึ้นหลังยืนยันคำขอ", en: "3. What Happens After Verification" },
      paragraphs: [
        {
          th: "หลังยืนยันตัวตน ผู้ดูแลจะลบหรือทำให้ข้อมูลบัญชีและข้อมูลที่เชื่อมโยงไม่สามารถระบุตัวบุคคลได้ รวมถึงข้อมูลโปรไฟล์ ตัวระบุผู้ให้บริการเข้าสู่ระบบ และข้อมูลกิจกรรมที่ไม่จำเป็นต้องเก็บต่อ การดำเนินการจะทำโดยไม่ชักช้าและภายในระยะเวลาที่กฎหมายกำหนด",
          en: "After verification, the administrator will delete or de-identify account data and linked information that no longer needs to be retained, including profile data, sign-in provider identifiers, and activity data. The request will be handled without undue delay and within the period required by applicable law.",
        },
      ],
    },
    {
      id: "retained-data",
      title: { th: "4. ข้อมูลที่อาจต้องเก็บไว้", en: "4. Data That May Be Retained" },
      paragraphs: [
        {
          th: "ข้อมูลบางรายการอาจต้องเก็บไว้ชั่วคราวเมื่อกฎหมายกำหนด หรือเมื่อจำเป็นต่อการชำระเงิน การบัญชี การป้องกันการทุจริต ความปลอดภัย หรือข้อพิพาท เมื่อหมดความจำเป็น ข้อมูลจะถูกลบหรือทำให้ไม่สามารถระบุตัวบุคคลได้",
          en: "Some records may be retained temporarily where required by law or needed for payments, accounting, fraud prevention, security, or disputes. When retention is no longer necessary, the data will be deleted or de-identified.",
        },
      ],
    },
    {
      id: "confirmation",
      title: { th: "5. การยืนยันผล", en: "5. Confirmation" },
      paragraphs: [
        {
          th: "ผู้ดูแลจะแจ้งผลหรือสถานะของคำขอผ่านอีเมลที่ใช้ยืนยันตัวตน หากไม่ได้รับการตอบกลับ โปรดส่งคำขออีกครั้งพร้อมระบุวันที่ส่งคำขอเดิม",
          en: "The administrator will provide the outcome or status through the verified email address. If no response is received, submit the request again and include the date of the original request.",
        },
      ],
    },
  ],
};

export const PUBLIC_LEGAL_DOCUMENTS = [
  PRIVACY_NOTICE,
  TERMS_OF_SERVICE,
  DATA_DELETION_INSTRUCTIONS,
] as const;

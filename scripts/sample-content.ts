export type SampleQuestion = [text: string, points: number, options: [string, string, string, string], correct: "A" | "B" | "C" | "D"];

export const FIRST_NAMES: [arabic: string, latin: string][] = [
  ["ليلى", "Layla"], ["أحمد", "Ahmad"], ["سارة", "Sara"], ["محمد", "Mohammad"], ["نور", "Nour"],
  ["عمر", "Omar"], ["ريم", "Reem"], ["يزن", "Yazan"], ["هبة", "Hiba"], ["زيد", "Zaid"],
  ["دانة", "Dana"], ["خالد", "Khaled"], ["جود", "Joud"], ["كريم", "Kareem"], ["لين", "Leen"],
  ["فارس", "Fares"], ["رزان", "Razan"], ["حمزة", "Hamza"], ["مريم", "Maryam"], ["يوسف", "Yousef"],
  ["تالا", "Tala"], ["إبراهيم", "Ibrahim"], ["يارا", "Yara"], ["علي", "Ali"], ["سلمى", "Salma"],
  ["سامي", "Sami"], ["رهف", "Rahaf"], ["طارق", "Tareq"], ["آية", "Aya"], ["أنس", "Anas"],
];

export const FAMILY_NAMES: [arabic: string, latin: string][] = [
  ["الخطيب", "Al-Khatib"], ["حداد", "Haddad"], ["العمري", "Al-Omari"], ["النابلسي", "Al-Nabulsi"],
  ["الزعبي", "Al-Zoubi"], ["المصري", "Al-Masri"], ["الحسن", "Al-Hasan"], ["عبيدات", "Obeidat"],
  ["الطراونة", "Al-Tarawneh"], ["المجالي", "Al-Majali"], ["بني هاني", "Bani Hani"], ["الشريف", "Al-Sharif"],
  ["القاسم", "Al-Qasem"], ["العتوم", "Al-Atoum"], ["الرفاعي", "Al-Rifai"],
];

export const CLASSES = ["10A", "10B", "11A"] as const;
export const STUDENTS_PER_CLASS = 20;
export const STUDENT_PASSWORD = "student123";
export const TEACHER_PASSWORD = "teacher123";

export const TEACHERS: { username: string; fullName: string }[] = [
  { username: "t.rana", fullName: "رنا صالح (Rana Saleh)" },
  { username: "t.khaled", fullName: "خالد منصور (Khaled Mansour)" },
  { username: "t.huda", fullName: "هدى يوسف (Huda Yousef)" },
  { username: "t.samer", fullName: "سامر عيسى (Samer Issa)" },
];

export const ENGLISH_QUIZ: SampleQuestion[] = [
  ["Choose the synonym of \"rapid\".", 1, ["slow", "quick", "heavy", "quiet"], "B"],
  ["Choose the antonym of \"ancient\".", 1, ["modern", "old", "historic", "early"], "A"],
  ["\"Reluctant\" means…", 2, ["eager", "careless", "unwilling", "happy"], "C"],
  ["She was ___ of the results, so she checked them twice.", 2, ["certain", "proud", "aware", "doubtful"], "D"],
  ["\"Abundant\" means…", 1, ["plentiful", "scarce", "tiny", "empty"], "A"],
  ["Which word is spelled correctly?", 1, ["recieve", "receive", "receeve", "riceive"], "B"],
  ["Choose the synonym of \"brave\".", 1, ["timid", "lazy", "courageous", "polite"], "C"],
  ["To \"postpone\" a meeting means to…", 2, ["cancel it", "start it", "repeat it", "delay it"], "D"],
  ["Choose the opposite of \"generous\".", 1, ["selfish", "kind", "wealthy", "honest"], "A"],
  ["A person who writes books is an…", 1, ["editor", "author", "actor", "auditor"], "B"],
  ["\"Fragile\" objects are easy to…", 1, ["lift", "clean", "break", "hide"], "C"],
  ["Which of these words is a noun?", 2, ["happily", "happy", "happier", "happiness"], "D"],
  ["Curious people like to…", 1, ["ask questions", "sleep", "stay silent", "give up"], "A"],
  ["Choose the synonym of \"enormous\".", 1, ["narrow", "huge", "thin", "gentle"], "B"],
  ["\"Meanwhile\" is closest in meaning to…", 3, ["afterwards", "never", "at the same time", "before"], "C"],
];

export const ARABIC_QUIZ: SampleQuestion[] = [
  ["ما نوع الكلمة «كَتَبَ»؟", 1, ["اسم", "فعل", "حرف", "ضمير"], "B"],
  ["ما جمع كلمة «كتاب»؟", 1, ["كتب", "كتابات", "كاتبون", "مكاتب"], "A"],
  ["ما الفاعل في جملة «قرأ الطالبُ الدرسَ»؟", 2, ["قرأ", "الدرس", "الطالب", "لا يوجد فاعل"], "C"],
  ["ما إعراب «الدرسَ» في جملة «قرأ الطالبُ الدرسَ»؟", 2, ["فاعل مرفوع", "مبتدأ", "خبر", "مفعول به منصوب"], "D"],
  ["أيّ الكلمات الآتية حرف جر؟", 1, ["في", "كان", "إنّ", "لم"], "A"],
  ["ما ضد كلمة «سريع»؟", 1, ["قوي", "بطيء", "كبير", "جميل"], "B"],
  ["كلمة «المعلمون» جمع:", 2, ["مؤنث سالم", "تكسير", "مذكر سالم", "مثنى"], "C"],
  ["ما مفرد كلمة «أقلام»؟", 1, ["قلمان", "أقلم", "مقلمة", "قلم"], "D"],
  ["في جملة «الجوُّ جميلٌ»، كلمة «جميلٌ» هي:", 2, ["خبر", "مبتدأ", "فاعل", "حال"], "A"],
  ["أيّ الأفعال الآتية فعل أمر؟", 1, ["يكتب", "اكتب", "كتب", "كاتب"], "B"],
  ["«كان» من:", 2, ["حروف الجر", "أدوات الاستفهام", "الأفعال الناسخة", "الضمائر"], "C"],
  ["ما علامة رفع المثنى؟", 3, ["الضمة", "الواو", "الياء", "الألف"], "D"],
  ["أيّ الكلمات الآتية ضمير منفصل؟", 1, ["هو", "ذلك", "الذي", "مَن"], "A"],
  ["ما مؤنث كلمة «طبيب»؟", 1, ["أطباء", "طبيبة", "طب", "طبيبان"], "B"],
  ["«لم» حرف:", 2, ["نصب", "جر", "جزم", "عطف"], "C"],
];

export const MATH_QUIZ: SampleQuestion[] = [
  ["If 3x = 12, what is x?", 1, ["3", "4", "6", "9"], "B"],
  ["If 2(x + 3) = 14, what is x?", 2, ["4", "5", "7", "8"], "A"],
  ["Simplify 5a + 3a − 2a.", 1, ["10a", "4a", "6a", "8a"], "C"],
  ["(−3) × (−4) = ?", 1, ["−12", "−7", "7", "12"], "D"],
  ["What is the slope of y = 2x + 5?", 1, ["5", "2", "7", "−2"], "B"],
  ["If x² = 49 and x > 0, what is x?", 1, ["7", "6", "8", "9"], "A"],
  ["What is 15% of 200?", 2, ["15", "20", "30", "45"], "C"],
  ["Solve x − 7 = −2.", 1, ["−9", "−5", "9", "5"], "D"],
  ["Expand (x + 2)(x + 3).", 3, ["x² + 5x + 6", "x² + 6x + 5", "x² + 6", "2x + 5"], "A"],
  ["What is 2³ + 3²?", 1, ["12", "17", "15", "25"], "B"],
  ["Which number is prime?", 1, ["21", "27", "29", "33"], "C"],
  ["Area of a 6 by 4 rectangle?", 1, ["10", "20", "28", "24"], "D"],
  ["Mean of 4, 8 and 12?", 2, ["8", "6", "10", "12"], "A"],
  ["√81 = ?", 1, ["7", "9", "8", "10"], "B"],
  ["For y = kx, y = 3 when x = 1. What is k?", 2, ["1", "2", "3", "4"], "C"],
];

export const SAMPLE_FILES = {
  students: "students.xlsx",
  teachers: "teachers.xlsx",
  englishQuiz: "quiz-english-vocabulary.xlsx",
  arabicQuiz: "quiz-arabic-grammar.xlsx",
  mathQuiz: "quiz-math-algebra-closed.xlsx",
} as const;

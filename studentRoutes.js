const express = require('express');
const router = express.Router();

// 1. የፈተና ጥያቄዎች እና የውጤት መዝገብ (Roster) ማከማቻ ባንክ
let examQuestions = [
    {
        id: 1,
        question: "የዩኒቨርሲቲው የመጀመሪያ ዓመት ተማሪዎች ምዝገባ የሚከናወነው በየትኛው ክፍል ነው?",
        options: ["ፋይናንስ", "ሬጅስትራር", "ዲፓርትመንት", "መምህራን"],
        correctAnswer: "ሬጅስትራር"
    }
];

let studentRoster = []; // ሙሉ የውጤት መዝገብ (Roster)

// 2. መምህራን ፈተና አዘጋጅተው በቀላሉ ወደ ሲስተሙ የሚያስገቡበት መስመር
router.post('/api/teacher/add-question', (req, res) => {
    const { question, options, correctAnswer } = req.body;
    if (!question || !options || !correctAnswer) {
        return res.status(400).json({ error: "እባክዎ ሁሉንም መረጃዎች በትክክል ይሙሉ!" });
    }
    const newQuestion = {
        id: examQuestions.length + 1,
        question,
        options,
        correctAnswer
    };
    examQuestions.push(newQuestion);
    res.json({ message: "ጥያቄው በተሳካ ሁኔታ ተመዝግቧል!", totalQuestions: examQuestions.length });
});

// 3. ተማሪው በራሱ አካውንት ገብቶ የፈተና ጥያቄዎችን የሚወስድበት መስመር (መልስ አይካተትም)
router.get('/api/student/get-exam', (req, res) => {
    const secureQuestions = examQuestions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options
    }));
    res.json(secureQuestions);
});

// 4. ሲስተሙ ፈተናውን በራሱ አርሞ፣ ግሬድ ሰርቶ ወደ ሮስተር የሚጭንበት ኢንጂን (Auto-Grading)
router.post('/api/student/submit-exam', (req, res) => {
    const { studentName, studentId, studentAnswers } = req.body;
    
    let score = 0;
    examQuestions.forEach(q => {
        if (studentAnswers[q.id] === q.correctAnswer) {
            score++;
        }
    });

    const totalQuestions = examQuestions.length;
    const percentage = (score / totalQuestions) * 100;
    
    // የዩኒቨርሲቲ ግሬድ አሰጣጥ ሥርዓት (Grading System)
    let grade = "F";
    if (percentage >= 90) grade = "A";
    else if (percentage >= 85) grade = "A-";
    else if (percentage >= 80) grade = "B+";
    else if (percentage >= 75) grade = "B";
    else if (percentage >= 70) grade = "B-";
    else if (percentage >= 65) grade = "C+";
    else if (percentage >= 60) grade = "C";
    else if (percentage >= 50) grade = "D";

    const rosterEntry = {
        studentName: studentName || "ያልታወቀ ተማሪ",
        studentId: studentId || "ID-000",
        score,
        totalQuestions,
        percentage: percentage.toFixed(2) + "%",
        grade,
        date: new Date().toLocaleDateString('am-ET')
    };

    studentRoster.push(rosterEntry); // ወደ ውጤት መዝገብ መጫን
    res.json({ message: "ፈተናው በስኬት ተጠናቋል!", result: rosterEntry });
});

// 5. ሬጅስትራር ወይም መምህራን ሙሉ የሮስተር (Roster) መዝገብ የሚያዩበት መስመር
router.get('/api/admin/roster', (req, res) => {
    res.json(studentRoster);
});

module.exports = router;

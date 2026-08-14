const express = require('express');

const router = express.Router();

const students = [];

router.post('/register', (req, res) => {
  const { name, gradeLevel, department, nationalId, FaydaID } = req.body;

  if (!nationalId && !FaydaID) {
    return res.status(400).json({
      message: 'Fayda ID is mandatory for all grades',
    });
  }

  const student = {
    id: students.length + 1,
    name,
    gradeLevel,
    department,
    nationalId: nationalId || FaydaID,
  };

  students.push(student);

  res.status(201).json({
    message: 'Student registered successfully',
    student,
  });
});

router.get('/analytics/ai-report/:tenantId', (req, res) => {
  const { tenantId } = req.params;

  const totalEnrollment = 1250;
  const femaleGrowth = 15;
  const pendingApplications = 5;

  const report = `AI Summary Report: Total enrollment has reached ${totalEnrollment}. Primary section female registration grew by ${femaleGrowth}% this week. ${pendingApplications} private applications are pending financial clearance.`;

  res.status(200).json({
    tenantId,
    report,
  });
});

module.exports = router;

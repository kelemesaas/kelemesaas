const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const { Schema } = mongoose;
const SALT_ROUNDS = 10;

// ===========================
// School/Tenant Schema
// ===========================
const SchoolSchema = new Schema({
  schoolName: { type: String, required: true, trim: true },
  subdomain: { type: String, required: true, unique: true, index: true, trim: true },
  address: { type: String },
  phone: { type: String },
  email: { type: String },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const School = mongoose.model('School', SchoolSchema);

// ===========================
// Department Schema
// ===========================
const DepartmentSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, required: true, ref: 'School', index: true },
  departmentName: { type: String, required: true, trim: true },
  code: { type: String },
  headId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

DepartmentSchema.index({ tenantId: 1, departmentName: 1 });
const Department = mongoose.model('Department', DepartmentSchema);

// ===========================
// User Schema (7 Roles)
// ===========================
const UserSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, required: true, ref: 'School', index: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['SuperAdmin', 'SchoolAdmin', 'FinanceHead', 'DepartmentHead', 'Teacher', 'Student', 'Parent'],
    index: true
  },
  
  // ===== Common Fields =====
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  password: { type: String, required: true },
  
  // Fayda NID: Unique for Grade 1 and above (not required for preschool)
  faydaNid: { type: String, unique: true, sparse: true, trim: true },
  
  // Approval status
  isApproved: { type: Boolean, default: false },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  
  // ===== Role-Specific Fields =====
  
  // SuperAdmin & SchoolAdmin
  permissions: [{ type: String }],
  
  // FinanceHead
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
  isFinanceHead: { type: Boolean, default: false },
  
  // DepartmentHead
  isDepartmentHead: { type: Boolean, default: false },
  managedDepartmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
  
  // Teacher
  isTeacher: { type: Boolean, default: false },
  employeeId: { type: String },
  subjects: [{ type: String }],
  assignedDepartmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
  
  // Student
  isStudent: { type: Boolean, default: false },
  studentId: { type: String },
  gradeLevel: { type: String },
  section: { type: String },
  enrollmentDate: { type: Date },
  guardianIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  
  // Parent
  isParent: { type: Boolean, default: false },
  relation: { type: String }, // e.g., "Father", "Mother", "Guardian"
  occupation: { type: String },
  childrenIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  
  // Metadata & timestamps
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for multi-tenancy
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
UserSchema.index({ tenantId: 1, role: 1 });

// Virtual fullName
UserSchema.virtual('fullName').get(function () {
  return `${this.firstName}${this.lastName ? ' ' + this.lastName : ''}`;
});

// ===== Password Hashing Pre-save Middleware =====
UserSchema.pre('save', async function (next) {
  try {
    // Only hash if password is new or modified
    if (!this.isModified('password')) return next();
    
    const hash = await bcrypt.hash(this.password, SALT_ROUNDS);
    this.password = hash;
    this.updatedAt = new Date();
    
    return next();
  } catch (err) {
    return next(err);
  }
});

// ===== Password Comparison Method =====
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ===== Approval Workflow Methods =====
UserSchema.methods.approve = async function (approverId) {
  this.isApproved = true;
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  return this.save();
};

const User = mongoose.model('User', UserSchema);

// ===========================
// Online Exam Schema
// ===========================
const ExamSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, required: true, ref: 'School', index: true },
  examTitle: { type: String, required: true, trim: true },
  description: { type: String },
  createdBy: { type: Schema.Types.ObjectId, required: true, ref: 'User' }, // Teacher ID
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
  
  // Exam Configuration
  durationMinutes: { type: Number, required: true }, // Duration in minutes
  totalPoints: { type: Number, default: 100 },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  
  // Questions Array
  questions: [{
    _id: Schema.Types.ObjectId,
    questionText: { type: String, required: true },
    questionType: { type: String, enum: ['multiple-choice', 'short-answer', 'essay'], default: 'multiple-choice' },
    options: [{ type: String }], // For multiple choice
    correctOptionIndex: { type: Number }, // Index of correct option (0-based)
    points: { type: Number, default: 1 },
    order: { type: Number }
  }],
  
  // Eligible Students
  eligibleGrades: [{ type: String }],
  eligibleSections: [{ type: String }],
  
  // Status
  status: { type: String, enum: ['draft', 'published', 'active', 'completed'], default: 'draft' },
  isShuffleQuestions: { type: Boolean, default: false },
  isShuffleOptions: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ExamSchema.index({ tenantId: 1, createdBy: 1 });
ExamSchema.index({ tenantId: 1, status: 1 });

const Exam = mongoose.model('Exam', ExamSchema);

// ===========================
// Exam Response/Submission Schema
// ===========================
const ExamResponseSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, required: true, ref: 'School', index: true },
  examId: { type: Schema.Types.ObjectId, required: true, ref: 'Exam' },
  studentId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  
  // Student Answers
  // Structure: [{ questionId, selectedOptionIndex or answerText }]
  answers: [{
    questionId: { type: Schema.Types.ObjectId },
    selectedOptionIndex: { type: Number }, // For multiple choice
    answerText: { type: String }, // For short answer/essay
    points: { type: Number, default: 0 },
    isCorrect: { type: Boolean, default: false }
  }],
  
  // Scoring
  totalScore: { type: Number, default: 0 },
  maxScore: { type: Number, default: 100 },
  percentage: { type: Number, default: 0 },
  grade: { type: String }, // e.g., "A", "B", "C", etc.
  
  // Grading
  isAutoGraded: { type: Boolean, default: false },
  gradedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // Manual grader if needed
  gradedAt: { type: Date },
  
  // Submission tracking
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date },
  timeTakenSeconds: { type: Number }, // Time taken by student
  
  // Review feedback
  feedback: { type: String },
  reviewed: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ExamResponseSchema.index({ tenantId: 1, examId: 1, studentId: 1 }, { unique: true });
ExamResponseSchema.index({ tenantId: 1, examId: 1 });
ExamResponseSchema.index({ studentId: 1 });

// ===== Auto-Grading Pre-save Middleware =====
ExamResponseSchema.pre('save', async function (next) {
  try {
    // Auto-grade if not yet graded
    if (!this.isAutoGraded && this.answers && this.answers.length > 0) {
      await this.autoGrade();
    }
    
    this.updatedAt = new Date();
    return next();
  } catch (err) {
    return next(err);
  }
});

// ===== Auto-Grading Method =====
ExamResponseSchema.methods.autoGrade = async function () {
  try {
    // Fetch the exam to get correct answers
    const exam = await Exam.findById(this.examId);
    if (!exam) throw new Error('Exam not found');
    
    let totalScore = 0;
    
    // Grade each answer
    this.answers.forEach(answer => {
      const question = exam.questions.find(q => q._id.equals(answer.questionId));
      if (!question) return;
      
      // For multiple choice, check if selected option is correct
      if (question.questionType === 'multiple-choice') {
        if (answer.selectedOptionIndex === question.correctOptionIndex) {
          answer.isCorrect = true;
          answer.points = question.points;
          totalScore += question.points;
        } else {
          answer.isCorrect = false;
          answer.points = 0;
        }
      }
      // For short answer/essay, manually mark as 0 (teacher will grade)
      else {
        answer.isCorrect = false;
        answer.points = 0;
      }
    });
    
    // Calculate scoring
    this.totalScore = totalScore;
    this.maxScore = exam.questions.reduce((sum, q) => sum + q.points, 0);
    this.percentage = this.maxScore > 0 ? (this.totalScore / this.maxScore) * 100 : 0;
    
    // Assign grade based on percentage
    if (this.percentage >= 90) this.grade = 'A';
    else if (this.percentage >= 80) this.grade = 'B';
    else if (this.percentage >= 70) this.grade = 'C';
    else if (this.percentage >= 60) this.grade = 'D';
    else this.grade = 'F';
    
    this.isAutoGraded = true;
    this.gradedAt = new Date();
    this.submittedAt = this.submittedAt || new Date();
    
    // Calculate time taken
    if (this.startedAt && this.submittedAt) {
      this.timeTakenSeconds = Math.floor((this.submittedAt - this.startedAt) / 1000);
    }
    
    return this;
  } catch (err) {
    console.error('Auto-grading error:', err);
    throw err;
  }
};

const ExamResponse = mongoose.model('ExamResponse', ExamResponseSchema);

// ===========================
// Exports
// ===========================
module.exports = {
  School,
  Department,
  User,
  Exam,
  ExamResponse
};

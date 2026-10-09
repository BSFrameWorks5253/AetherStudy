import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, ServerDocument } from '../../services/api';
import { TestPaper } from '../../types/testPaper';
import { uploadDirectToGoogleDrive } from '../../services/clientGoogleDrive';
import { BulkUploaderModal } from '../common/BulkUploaderModal';
import { CardSkeleton } from '../common/LoadingSkeleton';
import { UniversalPdfViewer } from '../common/UniversalPdfViewer';
import {
  GraduationCap,
  BookOpen,
  FileText,
  Upload,
  ArrowLeft,
  Download,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle,
  Eye,
  Calculator,
  Globe,
  Sparkles,
  Layers,
  AlertCircle,
  Briefcase,
  TrendingUp,
  Laptop,
  CheckCircle2,
  ListChecks,
  FolderUp,
  History,
} from 'lucide-react';
import { readingMemory, getCanonicalDocKey } from '../../services/readingMemory';

interface SubjectMeta {
  name: string;
  code: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorGradient: string;
  badgeColor: string;
}

// URL Slug Mapping Helpers
export const getSubjectSlug = (name: string): string => {
  if (!name) return 'general';
  const lower = name.toLowerCase();
  if (lower.includes('account') || lower.includes('bk')) return 'accounts';
  if (lower.includes('ocm') || lower.includes('organization') || lower.includes('organisation')) return 'ocm';
  if (lower.includes('eco')) return 'eco';
  if (lower.includes('math')) return 'maths';
  if (lower.includes('english') || lower.includes('yuvakbharati')) return 'english';
  if (lower.includes('information') || lower.includes('it')) return 'it';
  if (lower.includes('secretarial') || lower.includes('sp')) return 'sp';
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
};

export const findSubjectBySlug = (slug: string, subjects: SubjectMeta[]): string | null => {
  if (!slug) return null;
  const s = slug.toLowerCase();
  const direct = subjects.find((sub) => getSubjectSlug(sub.name) === s);
  if (direct) return direct.name;
  const loose = subjects.find(
    (sub) =>
      sub.name.toLowerCase() === s ||
      sub.code.toLowerCase().replace(/[^a-z0-9]/g, '') === s.replace(/[^a-z0-9]/g, '')
  );
  return loose ? loose.name : null;
};

export const matchSubjectDoc = (roomName: string, docSubject: string): boolean => {
  if (!roomName || !docSubject) return false;
  const rSlug = getSubjectSlug(roomName);
  const dSlug = getSubjectSlug(docSubject);
  if (rSlug === dSlug) return true;
  return roomName.trim().toLowerCase() === docSubject.trim().toLowerCase();
};

export interface ChapterItem {
  number: string;
  title: string;
  part?: string;
  keyTopics?: string;
}

export const COMMERCE_STD12_CHAPTERS: Record<string, ChapterItem[]> = {
  accounts: [
    { number: 'Chapter 1', title: 'Introduction to Partnership and Partnership Final Accounts', keyTopics: 'Trading A/c, P&L A/c, Balance Sheet adjustments, Partners Capital/Current A/c' },
    { number: 'Chapter 2', title: "Accounts of 'Not for Profit' Concerns", keyTopics: 'Receipts & Payments, Income & Expenditure A/c, Subscription, Capital Fund' },
    { number: 'Chapter 3', title: 'Reconstitution of Partnership (Admission of Partner)', keyTopics: 'New Profit Sharing Ratio, Sacrificing Ratio, Revaluation A/c, Goodwill treatment' },
    { number: 'Chapter 4', title: 'Reconstitution of Partnership (Retirement of Partner)', keyTopics: 'Gaining Ratio, Asset Revaluation, Settlement of Loan Account' },
    { number: 'Chapter 5', title: 'Reconstitution of Partnership (Death of Partner)', keyTopics: 'Profit share calculation, Legal Representative Executor A/c' },
    { number: 'Chapter 6', title: 'Dissolution of Partnership Firm', keyTopics: 'Realisation A/c, Partners Capital A/c, Bank A/c, Partner Deficiency' },
    { number: 'Chapter 7', title: 'Bills of Exchange', keyTopics: 'Promissory Note, Endorsement, Discounting, Dishonour & Renewal of Bill' },
    { number: 'Chapter 8', title: 'Company Accounts – Issue of Shares', keyTopics: 'Equity & Preference Shares, Calls in Arrears, Forfeiture & Re-issue' },
    { number: 'Chapter 9', title: 'Analysis of Financial Statements', keyTopics: 'Comparative Statements, Common-Size Statements, Cash Flow, Accounting Ratios' },
    { number: 'Chapter 10', title: 'Computer in Accounting', keyTopics: 'Electronic Accounting Systems, Ledger Grouping, Security Features, ERP' },
  ],
  maths: [
    // Part 1
    { number: 'Part 1 • 1', title: 'Mathematical Logic', part: 'Part 1', keyTopics: 'Statements, Truth Tables, Logical Connectives, Tautology, Contradiction, Duals & Negation' },
    { number: 'Part 1 • 2', title: 'Matrices', part: 'Part 1', keyTopics: 'Row/Column Transformations, Inverse by Adjoint Method, Linear Equations Solution' },
    { number: 'Part 1 • 3', title: 'Differentiation', part: 'Part 1', keyTopics: 'Chain Rule, Inverse Trigonometric Functions, Logarithmic Differentiation, Second Order' },
    { number: 'Part 1 • 4', title: 'Applications of Derivatives', part: 'Part 1', keyTopics: 'Tangents & Normals, Maxima & Minima, Marginal Cost & Revenue Analysis' },
    { number: 'Part 1 • 5', title: 'Integration', part: 'Part 1', keyTopics: 'Indefinite Integrals, Integration by Parts, Partial Fractions, Substitutions' },
    { number: 'Part 1 • 6', title: 'Definite Integration', part: 'Part 1', keyTopics: 'Definite Integral Properties, Fundamental Theorem of Calculus' },
    { number: 'Part 1 • 7', title: 'Applications of Definite Integration', part: 'Part 1', keyTopics: 'Area Under Curves, Consumer Surplus & Producer Surplus Calculations' },
    { number: 'Part 1 • 8', title: 'Differential Equations and Applications', part: 'Part 1', keyTopics: 'Order & Degree, Variable Separable Method, Homogeneous Equations, Growth/Decay' },
    // Part 2
    { number: 'Part 2 • 1', title: 'Commission, Brokerage, and Discount', part: 'Part 2', keyTopics: 'Agents Commission, Del-Credere, Trade Discount, Cash Discount, True Discount' },
    { number: 'Part 2 • 2', title: 'Insurance and Annuity', part: 'Part 2', keyTopics: 'Fire & Marine Insurance, Average Clause, Immediate Annuity, Annuity Due' },
    { number: 'Part 2 • 3', title: 'Linear Regression', part: 'Part 2', keyTopics: 'Scatter Diagrams, Regression Lines (Y on X & X on Y), Regression Coefficients' },
    { number: 'Part 2 • 4', title: 'Time Series', part: 'Part 2', keyTopics: 'Components of Time Series, Moving Averages Method, Least Squares Method' },
    { number: 'Part 2 • 5', title: 'Index Numbers', part: 'Part 2', keyTopics: "Laspeyre's, Paasche's, Fisher's Ideal Index, Cost of Living Index" },
    { number: 'Part 2 • 6', title: 'Linear Programming', part: 'Part 2', keyTopics: 'LPP Formulation, Graphical Method, Feasible Region & Optimal Solution' },
    { number: 'Part 2 • 7', title: 'Assignment Problem and Sequencing', part: 'Part 2', keyTopics: 'Hungarian Method, Unbalanced Assignment, n Jobs 2 Machines Sequencing' },
    { number: 'Part 2 • 8', title: 'Probability Distributions', part: 'Part 2', keyTopics: 'Random Variables, PMF, PDF, Expected Value, Binomial & Poisson Distribution' },
  ],
  eco: [
    { number: 'Chapter 1', title: 'Introduction to Micro-economics and Macro-economics', keyTopics: 'Features, Scope, Importance & Core Differences between Micro and Macro' },
    { number: 'Chapter 2', title: 'Utility Analysis', keyTopics: 'Total Utility, Marginal Utility, Law of Diminishing Marginal Utility (DMU) & Exceptions' },
    { number: 'Chapter 3A', title: 'Demand Analysis', keyTopics: 'Individual & Market Demand, Determinants of Demand, Law of Demand & Assumptions' },
    { number: 'Chapter 3B', title: 'Elasticity of Demand', keyTopics: 'Price, Income & Cross Elasticity, Measurement Methods, Factors Influencing Elasticity' },
    { number: 'Chapter 4', title: 'Supply Analysis', keyTopics: 'Individual & Market Supply, Law of Supply, Total Cost & Marginal Revenue Concepts' },
    { number: 'Chapter 5', title: 'Forms of Market', keyTopics: 'Perfect Competition, Monopoly, Monopolistic Competition & Oligopoly Features' },
    { number: 'Chapter 6', title: 'Index Numbers', keyTopics: 'Types of Index Numbers, Construction Methods, Significance in Economic Policy' },
    { number: 'Chapter 7', title: 'National Income', keyTopics: 'Circular Flow of Income, Measurement Methods (Output, Income, Expenditure), Difficulties' },
    { number: 'Chapter 8', title: 'Public Finance in India', keyTopics: 'Public Revenue (Direct/Indirect Tax), Public Expenditure, Public Debt, Fiscal Deficit' },
    { number: 'Chapter 9', title: 'Money Market and Capital Market in India', keyTopics: 'Organised & Unorganised Sectors, RBI Functions, Commercial Banks, SEBI Regulation' },
    { number: 'Chapter 10', title: 'Foreign Trade of India', keyTopics: 'Internal vs International Trade, Composition and Direction of India’s Export/Import' },
  ],
  ocm: [
    { number: 'Chapter 1', title: 'Principles of Management', keyTopics: "Henry Fayol's 14 Principles of Management, F. W. Taylor's Scientific Management Theory" },
    { number: 'Chapter 2', title: 'Functions of Management', keyTopics: 'Planning, Organising, Staffing, Directing, Coordinating, Controlling' },
    { number: 'Chapter 3', title: 'Entrepreneurship Development', keyTopics: 'Characteristics of an Entrepreneur, Startup India, Skill India, EDP Framework' },
    { number: 'Chapter 4', title: 'Business Services', keyTopics: 'Banking Types, Principles of Insurance, Warehousing, Transport & Communication' },
    { number: 'Chapter 5', title: 'Emerging Modes of Business', keyTopics: 'E-Business Benefits & Limitations, Outsourcing (BPO, KPO, LPO)' },
    { number: 'Chapter 6', title: 'Social Responsibilities of Business', keyTopics: 'Responsibilities towards Owners, Employees, Consumers, Government & Society' },
    { number: 'Chapter 7', title: 'Consumer Protection', keyTopics: 'Consumer Rights, Three-Tier Redressal Machinery (District, State, National Commission)' },
    { number: 'Chapter 8', title: 'Marketing', keyTopics: 'Functions of Marketing, 4Ps (Product, Price, Place, Promotion) vs 7Ps of Services' },
  ],
  it: [
    { number: 'Chapter 1', title: 'Advanced Web Designing', keyTopics: 'HTML5 Form Controls, CSS3 Selectors & Flexbox, Audio/Video Tags, Client-Side Validation' },
    { number: 'Chapter 2', title: 'Digital Marketing', keyTopics: 'Search Engine Optimization (SEO), On-Page & Off-Page Techniques, PageRank, Keywords' },
    { number: 'Chapter 3', title: 'Computerised Accounting with GST', keyTopics: 'Company Creation, Ledger Masters, GST Rates & Voucher Entries, Balance Sheet' },
    { number: 'Chapter 4', title: 'E-Commerce and E-Governance', keyTopics: 'B2B, B2C, C2C Models, E-Payment Security, E-Governance Models (G2C, G2B, G2G)' },
    { number: 'Chapter 5', title: 'Database Concepts using Libre Office Base', keyTopics: 'Relational Database, Primary Key, Foreign Key, Queries, Forms & Reports' },
    { number: 'Chapter 6', title: 'Enterprise Resource Planning (ERP)', keyTopics: 'ERP Modules (Supply Chain, Finance, HR), Integrated Database, Cloud ERP' },
  ],
  english: [
    { number: '1.1', title: 'An Astrologer’s Day', keyTopics: 'R. K. Narayan prose, Irony & Human nature, Vocabulary, Grammar' },
    { number: '1.2', title: 'On Saying “Please”', keyTopics: 'A. G. Gardiner prose, Social etiquette, Civility & Politeness' },
    { number: '1.3', title: 'The Cop and the Anthem', keyTopics: 'O. Henry story, Humour & Irony, Soapy’s resolution' },
    { number: '1.4', title: 'Big Data - Big Insights', keyTopics: 'Data revolution, Industry applications, Machine learning basics' },
    { number: '1.5', title: 'The New Dress', keyTopics: 'Virginia Woolf stream of consciousness, Self-consciousness' },
    { number: '2.1-2.6', title: 'Poetry & Appreciation (Section II)', keyTopics: 'Cherry Tree, Indian Weavers, The Inchcape Rock, Have You Earned Your Tomorrow' },
    { number: '3.1-3.6', title: 'Writing Skills & Novel (Section III & IV)', keyTopics: 'Summary, Mind Mapping, Note Making, SOP, History of English Novel' },
  ],
  sp: [
    { number: 'Chapter 1', title: 'Introduction to Corporate Finance', keyTopics: 'Fixed & Working capital, Capital structure determinants' },
    { number: 'Chapter 2', title: 'Sources of Corporate Finance', keyTopics: 'Owned capital (Equity, Preference), Borrowed capital (Debentures, Bonds, Loans)' },
    { number: 'Chapter 3', title: 'Issue of Shares', keyTopics: 'Public issue, Rights issue, Bonus shares, Allotment procedure, Share Certificate' },
    { number: 'Chapter 4', title: 'Issue of Debentures', keyTopics: 'Types of debentures, Debenture trustee, Procedure for issue' },
    { number: 'Chapter 5', title: 'Deposits', keyTopics: 'Acceptance of deposits from public & members, Terms & conditions' },
    { number: 'Chapter 6', title: 'Correspondence with Members', keyTopics: 'Letters for bonus shares, dividend warrant, electronic dividend mandate' },
    { number: 'Chapter 7', title: 'Correspondence with Debentureholders', keyTopics: 'Letters for allotment, interest payment, redemption of debentures' },
    { number: 'Chapter 8', title: 'Correspondence with Depositors', keyTopics: 'Letters for deposit receipt, interest payment, renewal of deposits' },
    { number: 'Chapter 9', title: 'Depository System', keyTopics: 'NSDL & CDSL, Dematerialisation, Fungibility, Benefits to investors' },
    { number: 'Chapter 10', title: 'Dividend and Interest', keyTopics: 'Interim & Final dividend, Unpaid dividend account, Legal provisions' },
    { number: 'Chapter 11', title: 'Financial Market', keyTopics: 'Money market vs Capital market, Primary market vs Secondary market' },
    { number: 'Chapter 12', title: 'Stock Exchange', keyTopics: 'BSE, NSE, Functions of Stock exchange, Trading procedure, SEBI regulation' },
  ],
};

export const COMMERCE_STD11_CHAPTERS: Record<string, ChapterItem[]> = {
  accounts: [
    { number: 'Chapter 1', title: 'Introduction to Book-keeping and Accountancy', keyTopics: 'Meaning, Definition, Objectives, Importance, Accounting Concepts, Conventions & Principles' },
    { number: 'Chapter 2', title: 'Meaning and Fundamental of Double Entry Book-keeping', keyTopics: 'Classification of Accounts, Golden Rules of Debit and Credit, Accounting Equation' },
    { number: 'Chapter 3', title: 'Source Documents and Journal', keyTopics: 'Cash Memo, Invoice, Receipts, Cheques, Journal Entries, Compound Entries, GST on Purchases/Sales' },
    { number: 'Chapter 4', title: 'Ledger', keyTopics: 'Posting from Journal to Ledger, Balancing of Ledger Accounts, Trial Balance' },
    { number: 'Chapter 5', title: 'Subsidiary Books', keyTopics: 'Simple Cash Book, Petty Cash Book (Analytical), Purchase Book, Sales Book, Return Books' },
    { number: 'Chapter 6', title: 'Bank Reconciliation Statement', keyTopics: 'Pass Book vs Cash Book Differences, Timing Differences, Preparation of BRS' },
    { number: 'Chapter 7', title: 'Depreciation', keyTopics: 'Causes of Depreciation, Straight Line Method (SLM), Written Down Value (WDV) Method' },
    { number: 'Chapter 8', title: 'Rectification of Errors', keyTopics: 'Errors of Omission, Commission, Principle, Suspense Account' },
    { number: 'Chapter 9', title: 'Final Accounts of a Proprietary Concern', keyTopics: 'Trading Account, Profit & Loss Account, Balance Sheet, Adjustments (Closing Stock, Outstanding)' },
    { number: 'Chapter 10', title: 'Single Entry System', keyTopics: 'Statement of Affairs Method, Calculation of Profit or Loss, Conversion Basics' },
  ],
  ocm: [
    { number: 'Chapter 1', title: 'Introduction of Commerce and Business', keyTopics: 'Economic & Non-economic Activities, Industry Types, Commerce, Auxiliaries to Trade' },
    { number: 'Chapter 2', title: 'Trade', keyTopics: 'Internal Trade (Wholesale, Retail), International Trade (Import, Export, Entrepot), WTO, Incoterms' },
    { number: 'Chapter 3', title: 'Small Scale Industry and Business', keyTopics: 'Meaning, Definition, Importance, Problems & Government Initiatives for SSI / MSME' },
    { number: 'Chapter 4', title: 'Forms of Business Organisation - I', keyTopics: 'Sole Trading Concern, Joint Hindu Family Business, Partnership Firm, Limited Liability Partnership' },
    { number: 'Chapter 5', title: 'Forms of Business Organisation - II', keyTopics: 'Co-operative Society, Joint Stock Company, Multinational Corporations (MNCs)' },
    { number: 'Chapter 6', title: 'Institutes Supporting Business', keyTopics: 'SIDBI, NABARD, KVIC, Mahila Bachat Gat, District Industries Centre (DIC)' },
    { number: 'Chapter 7', title: 'Business Environment', keyTopics: 'Economic, Social, Political, Legal, Technological Environment & Impact of LPG Policy' },
    { number: 'Chapter 8', title: 'Introduction to Management', keyTopics: 'Characteristics, Levels of Management (Top, Middle, Lower), Management as Art, Science & Profession' },
  ],
  eco: [
    { number: 'Chapter 1', title: 'Basic Concepts in Economics', keyTopics: 'Wants, Goods & Services, Utility, Value, Wealth, National Income, Branches of Economics' },
    { number: 'Chapter 2', title: 'Money', keyTopics: 'Barter System & Difficulties, Evolution of Money, Types of Money, Qualities of Good Money, Inflation' },
    { number: 'Chapter 3', title: 'Partition Values', keyTopics: 'Quartiles, Deciles, Percentiles for Raw Data, Ungrouped & Grouped Frequency Distributions' },
    { number: 'Chapter 4', title: 'The Economy of Maharashtra', keyTopics: 'Administrative Divisions, Agriculture, Industry, Infrastructure & Tourism in Maharashtra' },
    { number: 'Chapter 5', title: 'Rural Development in India', keyTopics: 'Agricultural Credit, Non-Agricultural Credit, Rural Infrastructure, NABARD, Microfinance' },
    { number: 'Chapter 6', title: 'Population in India', keyTopics: 'Trends in Population Growth, Causes of High Birth Rate, Family Planning & National Population Policy' },
    { number: 'Chapter 7', title: 'Unemployment in India', keyTopics: 'Types of Unemployment (Disguised, Seasonal, Educated, Structural), Causes & Employment Schemes' },
    { number: 'Chapter 8', title: 'Poverty in India', keyTopics: 'Absolute vs Relative Poverty, Poverty Line, Causes of Poverty & Government Poverty Alleviation Schemes' },
    { number: 'Chapter 9', title: 'Economic Policy of India since 1991', keyTopics: 'Liberalisation, Privatisation, Globalisation (LPG), Foreign Direct Investment, WTO Impact' },
    { number: 'Chapter 10', title: 'Economic Planning in India', keyTopics: 'Planning Commission vs NITI Aayog, Five-Year Plans, Sustainable Development Goals' },
  ],
  maths: [
    // Part 1
    { number: 'Part 1 • 1', title: 'Sets and Relations', part: 'Part 1', keyTopics: 'Types of Sets, Venn Diagrams, Algebra of Sets, Cartesian Product, Types of Relations' },
    { number: 'Part 1 • 2', title: 'Functions', part: 'Part 1', keyTopics: 'Domain, Co-domain, Range, One-one, Onto Functions, Inverse & Composite Functions' },
    { number: 'Part 1 • 3', title: 'Complex Numbers', part: 'Part 1', keyTopics: 'Algebra of Complex Numbers, Conjugate, Modulus, Argument & Polar Representation' },
    { number: 'Part 1 • 4', title: 'Sequences and Series', part: 'Part 1', keyTopics: 'Arithmetic Progression (AP), Geometric Progression (GP), Harmonic Progression (HP), Sum to n terms' },
    { number: 'Part 1 • 5', title: 'Locus and Straight Line', part: 'Part 1', keyTopics: 'Equation of Locus, Slope of a Line, Various Forms of Equations of Straight Lines' },
    { number: 'Part 1 • 6', title: 'Determinants', part: 'Part 1', keyTopics: 'Determinants of Order 2 and 3, Properties of Determinants, Cramers Rule for 3 variables' },
    { number: 'Part 1 • 7', title: 'Limits', part: 'Part 1', keyTopics: 'Definition of Limits, Standard Limits (Algebraic, Trigonometric, Exponential & Logarithmic)' },
    { number: 'Part 1 • 8', title: 'Continuity', part: 'Part 1', keyTopics: 'Continuity of a Function at a Point and in an Interval, Removable & Jump Discontinuities' },
    { number: 'Part 1 • 9', title: 'Differentiation', part: 'Part 1', keyTopics: 'Derivative as Rate Measure, Derivatives of Standard Functions by First Principle, Product & Quotient Rules' },
    // Part 2
    { number: 'Part 2 • 1', title: 'Partition Values', part: 'Part 2', keyTopics: 'Quartiles (Q1, Q2, Q3), Deciles and Percentiles for Grouped & Ungrouped Data' },
    { number: 'Part 2 • 2', title: 'Measures of Dispersion', part: 'Part 2', keyTopics: 'Range, Quartile Deviation, Mean Deviation, Standard Deviation & Variance, Coefficient of Variation' },
    { number: 'Part 2 • 3', title: 'Skewness', part: 'Part 2', keyTopics: 'Karl Pearsons Coefficient of Skewness, Bowleys Coefficient of Skewness, Symmetrical Distributions' },
    { number: 'Part 2 • 4', title: 'Bivariate Frequency Distribution and Chi Square', part: 'Part 2', keyTopics: 'Marginal & Conditional Distributions, Chi-Square Test of Independence' },
    { number: 'Part 2 • 5', title: 'Correlation', part: 'Part 2', keyTopics: 'Scatter Diagram, Karl Pearsons Correlation Coefficient (r), Spearmans Rank Correlation' },
    { number: 'Part 2 • 6', title: 'Permutations and Combinations', part: 'Part 2', keyTopics: 'Fundamental Principle of Counting, nPr & nCr formulas and Real-World Applications' },
    { number: 'Part 2 • 7', title: 'Mathematical Induction and Binomial Theorem', part: 'Part 2', keyTopics: 'Principle of Mathematical Induction, Binomial Expansion, General & Middle Terms' },
    { number: 'Part 2 • 8', title: 'Linear Inequations', part: 'Part 2', keyTopics: 'Linear Inequations in One & Two Variables, Graphical Solutions and Feasible Region' },
    { number: 'Part 2 • 9', title: 'Commercial Mathematics', part: 'Part 2', keyTopics: 'Simple Interest, Compound Interest, Annuities, Amortization & Sinking Fund' },
  ],
  it: [
    { number: 'Chapter 1', title: 'Basics of Information Technology', keyTopics: 'Computer Fundamentals, Hardware, Software, Operating Systems, Linux Open Source' },
    { number: 'Chapter 2', title: 'Introduction to DBMS', keyTopics: 'Data vs Information, Relational Database Model, LibreOffice Base, Tables, Queries, Primary Key' },
    { number: 'Chapter 3', title: 'Cyber Law', keyTopics: 'IT Act 2000, Cyber Crimes (Hacking, Phishing, Identity Theft), Software Piracy, Digital Signatures' },
    { number: 'Chapter 4', title: 'Web Designing with HTML5 & CSS', keyTopics: 'HTML Structure, Semantic Tags, Tables, Lists, Inline/Internal/External CSS, Selectors' },
    { number: 'Chapter 5', title: 'Server Technologies', keyTopics: 'Web Servers, Client-Server Architecture, Cloud Hosting, DNS, IP Protocols' },
    { number: 'Chapter 6', title: 'Cloud Computing', keyTopics: 'IaaS, PaaS, SaaS, Public/Private Cloud, Security in Cloud Storage' },
  ],
  english: [
    { number: 'Unit 1', title: 'Prose & Short Stories', keyTopics: 'Being Neighborly, On To The Summit, Call of the Soil, Pillars of Democracy, Mrs. Adis' },
    { number: 'Unit 2', title: 'Poetry & Appreciation', keyTopics: 'Cherry Tree, The Sower, There is Another Sky, Upon Westminster Bridge, Indian Weavers' },
    { number: 'Unit 3', title: 'Writing Skills & Composition', keyTopics: 'Expansion of Ideas, Blog Writing, Emails, Interview Questions, Film Review, Script Writing' },
    { number: 'Unit 4', title: 'Drama Appreciation', keyTopics: 'History of English Drama, The Rising of the Moon, A Midsummer Night’s Dream' },
  ],
  sp: [
    { number: 'Chapter 1', title: 'Secretary', keyTopics: 'Origin, Meaning, Definition, Features, Types of Secretaries (Personal, Association, Company)' },
    { number: 'Chapter 2', title: 'Joint Stock Company', keyTopics: 'Evolution of Business, Definition, Features, Types of Companies (Private, Public, OPC)' },
    { number: 'Chapter 3', title: 'Formation of a Company', keyTopics: 'Promotion Stage, Incorporation / Registration, Commencement of Business, Promoters' },
    { number: 'Chapter 4', title: 'Documents Related to Formation of a Company', keyTopics: 'Memorandum of Association (MoA Clauses), Articles of Association (AoA), Prospectus' },
    { number: 'Chapter 5', title: 'Members of a Company', keyTopics: 'Acquisition of Membership, Rights, Duties, Liabilities & Termination of Membership' },
    { number: 'Chapter 6', title: 'Directors and Key Managerial Personnel', keyTopics: 'Board of Directors, Managing Director, Company Secretary Qualifications, Role & Responsibilities' },
    { number: 'Chapter 7', title: 'Company Meetings - I', keyTopics: 'Essentials of a Valid Meeting (Notice, Agenda, Quorum, Chairman, Proxy, Voting, Resolutions)' },
    { number: 'Chapter 8', title: 'Company Meetings - II', keyTopics: 'Annual General Meeting (AGM), Extra-Ordinary General Meeting (EGM), Board Meetings' },
    { number: 'Chapter 9', title: 'Business Communication Skills of Secretary', keyTopics: 'Layout of Business Letters, Essentials of Good Correspondence, Electronic Communication' },
    { number: 'Chapter 10', title: 'Correspondence with Directors', keyTopics: 'Notice of Board Meeting, Reminding of Decisions, Sending Draft Minutes' },
    { number: 'Chapter 11', title: 'Correspondence with Banks', keyTopics: 'Opening Current Account, Requesting Overdraft, Stop Payment of Cheque' },
    { number: 'Chapter 12', title: 'Correspondence with Statutory Authorities', keyTopics: 'Letters to Registrar of Companies (ROC), Ministry of Corporate Affairs, Tax Authorities' },
  ],
};

export const ALL_SYLLABUS_CHAPTERS: Record<string, Record<string, ChapterItem[]>> = {
  '12': COMMERCE_STD12_CHAPTERS,
  '11': COMMERCE_STD11_CHAPTERS,
};

export const toRomanStandard = (std?: string | number): string => {
  if (!std) return 'XII';
  const clean = std.toString().trim().toUpperCase();
  if (clean === '12' || clean === 'XII') return 'XII';
  if (clean === '11' || clean === 'XI') return 'XI';
  if (clean === '10' || clean === 'X') return 'X';
  if (clean === '9' || clean === 'IX') return 'IX';
  return clean;
};

// Match uploaded study documents to specific chapters with strict standard segregation
export const getDocsForChapter = (
  ch: ChapterItem,
  docs: ServerDocument[],
  targetStandard?: string
): ServerDocument[] => {
  if (!docs || docs.length === 0) return [];
  const numDigits = ch.number.match(/\d+/)?.[0];

  return docs.filter((d) => {
    // 0. Strict standard check: never attach a Standard 11 doc to Standard 12, or vice versa
    if (targetStandard && targetStandard !== 'ALL') {
      if (d.standard && d.standard !== 'ALL' && d.standard !== targetStandard) {
        return false;
      }
    }

    const dName = (d.originalName || d.name || '').toLowerCase();

    // Prevent FYJC notes from ever attaching to HSC or vice versa
    if (targetStandard === '12' && (dName.includes('fyjc') || dName.includes('std 11') || dName.includes('class 11'))) {
      return false;
    }
    if (targetStandard === '11' && (dName.includes('hsc') || dName.includes('std 12') || dName.includes('class 12'))) {
      return false;
    }

    // Check part discrimination for subjects with multiple parts (like Maths Part 1 & 2)
    if (ch.part) {
      const p = String(ch.part).toLowerCase();
      if (p.includes('1') && (dName.includes('part 2') || dName.includes('pt 2') || dName.includes('part-2') || dName.includes('maths 2') || dName.includes('maths-2'))) return false;
      if (p.includes('2') && (dName.includes('part 1') || dName.includes('pt 1') || dName.includes('part-1') || dName.includes('maths 1') || dName.includes('maths-1'))) return false;
    }

    // 1. Exact "Chapter X" / "Chp X" / "Ch X" matching
    if (numDigits) {
      const chRegex = new RegExp(`(?:chapter|chpt|chp|ch|unit)\\s*[-_.]?\\s*0?${numDigits}(?:[^0-9]|$)`, 'i');
      if (chRegex.test(dName)) return true;

      // Leading number e.g. "1- B.K Chapter 1..." or "01 - ..."
      const leadRegex = new RegExp(`^0?${numDigits}\\s*[-_.]`, 'i');
      if (leadRegex.test(dName)) return true;
    }

    // 2. Direct topic keyword matching
    const titleLower = ch.title.toLowerCase();
    if (titleLower.includes('partition') && dName.includes('partition')) return true;
    if (titleLower.includes('dispersion') && dName.includes('dispersion')) return true;
    if (titleLower.includes('skewness') && dName.includes('skewness')) return true;
    if (titleLower.includes('bivariate') && dName.includes('bivariate')) return true;
    if (titleLower.includes('correlation') && (dName.includes('correlation') || dName.includes('coorelation'))) return true;
    if (titleLower.includes('money') && dName.includes('money')) return true;
    if (titleLower.includes('cyber') && dName.includes('cyber')) return true;
    if (titleLower.includes('grammar') && dName.includes('grammar')) return true;
    if (titleLower.includes('novel') && (dName.includes('novel') || dName.includes('drama'))) return true;
    if (titleLower.includes('poem') && (dName.includes('poem') || dName.includes('poetry'))) return true;
    if (titleLower.includes('prose') && dName.includes('prose')) return true;
    if (titleLower.includes('writing') && dName.includes('writing')) return true;

    return false;
  });
};

const DEFAULT_STANDARD_SUBJECTS: Record<string, SubjectMeta[]> = {
  // Hardcoded Standard 12 Commerce Subjects
  '12': [
    {
      name: 'Book-Keeping & Accountancy (Accounts)',
      code: 'BK-XII',
      description: 'Partnership Final Accounts, Reconstitution, Dissolution, Company Accounts & Computerised Accounting',
      icon: Calculator,
      colorGradient: 'from-emerald-600 to-teal-700',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    {
      name: 'Organization of Commerce & Management (OCM)',
      code: 'OCM-XII',
      description: 'Principles of Management, Functions, Entrepreneurship Development & Business Services',
      icon: Briefcase,
      colorGradient: 'from-blue-600 to-indigo-700',
      badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
    {
      name: 'Economics (ECO)',
      code: 'ECO-XII',
      description: 'Micro & Macro Economics, Utility, Elasticity of Demand, National Income & Public Finance',
      icon: TrendingUp,
      colorGradient: 'from-purple-600 to-violet-700',
      badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    },
    {
      name: 'Mathematics & Statistics (Commerce)',
      code: 'MATH-XII',
      description: 'Part 1 (Mathematical Logic, Matrices, Calculus) & Part 2 (Commercial Mathematics, Linear Regression)',
      icon: Calculator,
      colorGradient: 'from-amber-600 to-orange-700',
      badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    {
      name: 'English (Yuvakbharati)',
      code: 'ENG-XII',
      description: 'Yuvakbharati Prose, Poetry, Writing Skills, Drama & History of English Novel',
      icon: BookOpen,
      colorGradient: 'from-sky-600 to-cyan-700',
      badgeColor: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    },
    {
      name: 'Information Technology (IT)',
      code: 'IT-XII',
      description: 'Advanced Web Designing, SEO, Advanced JavaScript, Server Technologies & E-Commerce / E-Governance',
      icon: Laptop,
      colorGradient: 'from-cyan-600 to-blue-700',
      badgeColor: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    },
    {
      name: 'Secretarial Practice (SP)',
      code: 'SP-XII',
      description: 'Corporate Finance, Sources of Capital, Issue of Shares & Debentures, Deposit Correspondence',
      icon: FileText,
      colorGradient: 'from-rose-600 to-pink-700',
      badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    },
    {
      name: 'Hindi',
      code: 'HIN-XII',
      description: 'Yuvakbharati Hindi Prose, Poetry, Kahani & Vyakaran (Grammar)',
      icon: BookOpen,
      colorGradient: 'from-orange-600 to-amber-700',
      badgeColor: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    },
    {
      name: 'Marathi',
      code: 'MAR-XII',
      description: 'Yuvakbharati Marathi Gadya, Padya, Katha & Vyakaran (Grammar)',
      icon: BookOpen,
      colorGradient: 'from-teal-600 to-emerald-700',
      badgeColor: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    },
  ],
  '10': [
    {
      name: 'English',
      code: 'ENG-X',
      description: 'Kumarbharati Comprehensive Language & Literature',
      icon: BookOpen,
      colorGradient: 'from-blue-600 to-indigo-700',
      badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
    {
      name: 'Science & Technology',
      code: 'SCI-X',
      description: 'Part 1 (Physics & Chemistry) + Part 2 (Biology & Ecology)',
      icon: Sparkles,
      colorGradient: 'from-emerald-600 to-teal-700',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    {
      name: 'Mathematics',
      code: 'MATH-X',
      description: 'Algebra & Geometry Problem Solving Frameworks',
      icon: Calculator,
      colorGradient: 'from-amber-600 to-orange-700',
      badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    {
      name: 'Social Sciences',
      code: 'SOC-X',
      description: 'History, Political Science & Geography Analysis',
      icon: Globe,
      colorGradient: 'from-sky-600 to-cyan-700',
      badgeColor: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    },
  ],
  '11': [
    {
      name: 'Book-Keeping & Accountancy (Accounts)',
      code: 'BK-XI',
      description: 'Introduction to Book Keeping, Meaning & Fundamentals of Double Entry, Journal, Ledger & Subsidiary Books',
      icon: Calculator,
      colorGradient: 'from-emerald-600 to-teal-700',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    {
      name: 'Organization of Commerce & Management (OCM)',
      code: 'OCM-XI',
      description: 'Introduction to Business, Forms of Business Organization, Private & Public Sector Enterprises',
      icon: Briefcase,
      colorGradient: 'from-blue-600 to-indigo-700',
      badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
    {
      name: 'Economics (ECO)',
      code: 'ECO-XI',
      description: 'Basic Concepts of Economics, Money, Partition Values, Economy of Maharashtra, Rural Development',
      icon: TrendingUp,
      colorGradient: 'from-purple-600 to-violet-700',
      badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    },
    {
      name: 'Mathematics & Statistics (Commerce)',
      code: 'MATH-XI',
      description: 'Part 1 (Sets, Complex Numbers, Functions, Limits) & Part 2 (Partition Values, Dispersion, Skewness, Correlation)',
      icon: Calculator,
      colorGradient: 'from-amber-600 to-orange-700',
      badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    {
      name: 'Information Technology (IT)',
      code: 'IT-XI',
      description: 'Basics of Information Technology, Introduction to DBMS, Cyber Law & Web Designing with HTML',
      icon: Laptop,
      colorGradient: 'from-cyan-600 to-blue-700',
      badgeColor: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    },
    {
      name: 'English (Yuvakbharati)',
      code: 'ENG-XI',
      description: 'FYJC Foundation in English Composition, Prose, Poetry, Writing Skills & Drama Appreciation',
      icon: BookOpen,
      colorGradient: 'from-sky-600 to-cyan-700',
      badgeColor: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    },
    {
      name: 'Secretarial Practice (SP)',
      code: 'SP-XI',
      description: 'Secretary Fundamentals, Joint Stock Company, Promotion & Documents of a Company, Directors and KMP',
      icon: FileText,
      colorGradient: 'from-rose-600 to-pink-700',
      badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    },
    {
      name: 'Hindi',
      code: 'HIN-XI',
      description: 'FYJC Foundation in Hindi Sahitya, Poetry & Applied Grammar',
      icon: BookOpen,
      colorGradient: 'from-orange-600 to-amber-700',
      badgeColor: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    },
    {
      name: 'Marathi',
      code: 'MAR-XI',
      description: 'FYJC Foundation in Marathi Sahitya, Poetry & Applied Grammar',
      icon: BookOpen,
      colorGradient: 'from-teal-600 to-emerald-700',
      badgeColor: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    },
  ],
  '9': [
    {
      name: 'English',
      code: 'ENG-IX',
      description: 'Core Literary Analysis & Expressive Grammar',
      icon: BookOpen,
      colorGradient: 'from-blue-600 to-indigo-700',
      badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
    {
      name: 'Science & Technology',
      code: 'SCI-IX',
      description: 'Laws of Motion, Work & Energy, Carbon Compounds',
      icon: Sparkles,
      colorGradient: 'from-emerald-600 to-teal-700',
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    {
      name: 'Mathematics',
      code: 'MATH-IX',
      description: 'Sets, Real Numbers, Polynomials & Coordinate Geometry',
      icon: Calculator,
      colorGradient: 'from-amber-600 to-orange-700',
      badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    {
      name: 'Social Science',
      code: 'SOC-IX',
      description: 'Post-Independence India, Democratic Rights & Geography',
      icon: Globe,
      colorGradient: 'from-sky-600 to-cyan-700',
      badgeColor: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    },
  ],
};

export const SubjectRooms: React.FC = () => {
  const { currentUser, isSuperAdmin, canUpload, activeStandard } = useAuth();

  // Navigation & Room State
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'syllabus' | 'textbooks' | 'notes' | 'pyq'>('syllabus');
  const [readingDoc, setReadingDoc] = useState<ServerDocument | null>(null);

  // Chapter syllabus mastery tracking (persisted in localStorage)
  const [completedChapters, setCompletedChapters] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('aether_chapter_progress');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Document & Subject & PYQ Data
  const [documents, setDocuments] = useState<ServerDocument[]>([]);
  const [testPapers, setTestPapers] = useState<TestPaper[]>([]);
  const [serverSubjects, setServerSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(false);

  // Auto-dismiss PDF loader overlay after 2.5s to prevent freezing on mobile
  useEffect(() => {
    if (readingDoc && isPdfLoading) {
      const timer = setTimeout(() => {
        setIsPdfLoading(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [readingDoc, isPdfLoading]);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [uploadSubject, setUploadSubject] = useState<string>('');
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<'textbook' | 'notes'>('textbook');
  const [uploadStandard, setUploadStandard] = useState<string>('12');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents and subjects
  const loadContent = async () => {
    setIsLoading(true);
    try {
      const [docs, subjs, papers] = await Promise.all([
        api.getDocuments(),
        api.getSubjects(),
        api.getTestPapers(),
      ]);
      setDocuments(docs);
      setServerSubjects(subjs);
      setTestPapers(papers);
    } catch (err) {
      console.warn('Could not load subjects and documents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContent();
  }, [activeStandard, isSuperAdmin]);

  // Pending PDF slug requested by URL
  const [pendingPdfSlug, setPendingPdfSlug] = useState<string | null>(null);

  // Sync uploadStandard whenever activeStandard changes
  useEffect(() => {
    if (activeStandard && activeStandard !== 'ALL') {
      setUploadStandard(activeStandard);
    }
  }, [activeStandard]);

  // Dynamic color palette generator for custom created subjects
  const DYNAMIC_GRADIENTS = [
    { gradient: 'from-violet-600 to-indigo-700', badge: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800' },
    { gradient: 'from-emerald-600 to-teal-700', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
    { gradient: 'from-rose-600 to-pink-700', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
    { gradient: 'from-amber-600 to-orange-700', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
    { gradient: 'from-cyan-600 to-blue-700', badge: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' },
    { gradient: 'from-fuchsia-600 to-purple-700', badge: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800' },
  ];

  // Combined subject list for the active standard (Base Subjects + Automatically Created Subjects)
  const availableSubjects: SubjectMeta[] = useMemo(() => {
    const stdKey = activeStandard === 'ALL' ? '12' : activeStandard;
    const baseList = DEFAULT_STANDARD_SUBJECTS[stdKey] || DEFAULT_STANDARD_SUBJECTS['12'];

    // Collect all candidate subjects from:
    // 1. Server subjects list (/api/subjects)
    // 2. Uploaded documents in state (doc.subject)
    const candidateSubjects = new Set<string>();
    serverSubjects.forEach((s) => {
      if (s && s.trim()) candidateSubjects.add(s.trim());
    });
    documents.forEach((d) => {
      if (d.subject && d.subject.trim()) candidateSubjects.add(d.subject.trim());
    });

    const customList: SubjectMeta[] = [];
    let colorIdx = 0;

    candidateSubjects.forEach((subName) => {
      // Check if subName matches any base subject
      const alreadyInBase = baseList.some(
        (baseSub) => matchSubjectDoc(baseSub.name, subName)
      );
      if (!alreadyInBase) {
        const theme = DYNAMIC_GRADIENTS[colorIdx % DYNAMIC_GRADIENTS.length];
        colorIdx++;
        const codePrefix = subName.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'SUB';
        customList.push({
          name: subName,
          code: `${codePrefix}-${toRomanStandard(stdKey)}`,
          description: `Custom curated learning room for ${subName} (Class ${toRomanStandard(activeStandard)})`,
          icon: Layers,
          colorGradient: theme.gradient,
          badgeColor: theme.badge,
        });
      }
    });

    return [...baseList, ...customList];
  }, [activeStandard, serverSubjects, documents]);

  // Local standard toggle when user selects "ALL" in the header
  const [roomStandardView, setRoomStandardView] = useState<'12' | '11'>('12');

  // Synchronize roomStandardView when header activeStandard changes
  useEffect(() => {
    if (activeStandard === '11') {
      setRoomStandardView('11');
    } else if (activeStandard === '12') {
      setRoomStandardView('12');
    }
  }, [activeStandard]);

  const effectiveStandard = activeStandard === 'ALL' ? roomStandardView : (activeStandard || '12');

  // Filter documents strictly by effective standard (never mix Std 11 and Std 12!)
  const standardFilteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (!effectiveStandard) return true;
      if (doc.standard && doc.standard !== 'ALL' && doc.standard !== effectiveStandard) {
        return false;
      }
      return true;
    });
  }, [documents, effectiveStandard]);

  // Documents inside the selected room (strictly matching subject AND standard)
  const roomDocuments = useMemo(() => {
    if (!activeRoom) return [];
    return standardFilteredDocuments.filter(
      (doc) => matchSubjectDoc(activeRoom, doc.subject || '')
    );
  }, [standardFilteredDocuments, activeRoom]);

  // Deep Link URL sync logic
  const syncWithUrl = () => {
    const pathname = window.location.pathname;
    if (!pathname.startsWith('/studyroom')) return;

    const subPath = pathname.replace(/^\/studyroom\/?/, '');
    const segments = subPath ? subPath.split('/').filter(Boolean) : [];

    if (segments.length === 0) {
      setActiveRoom(null);
      setReadingDoc(null);
      return;
    }

    const subjectSlug = decodeURIComponent(segments[0]);
    let matchedSubject = findSubjectBySlug(subjectSlug, availableSubjects);
    
    // Fallback: If not found in active standard, search across all standards (12, 11, 10, 9)
    if (!matchedSubject) {
      const allBase = Object.values(DEFAULT_STANDARD_SUBJECTS).flat();
      matchedSubject = findSubjectBySlug(subjectSlug, allBase);
    }

    // Fallback: Check if any uploaded document matches this slug
    if (!matchedSubject && documents.length > 0) {
      const docWithSub = documents.find((d) => getSubjectSlug(d.subject || '') === subjectSlug.toLowerCase());
      if (docWithSub && docWithSub.subject) {
        matchedSubject = docWithSub.subject;
      }
    }

    if (matchedSubject) {
      setActiveRoom(matchedSubject);
      // Auto-switch to notes or textbooks if this room doesn't have official syllabus chapters
      const sSlug = getSubjectSlug(matchedSubject);
      const chaps = COMMERCE_STD12_CHAPTERS[sSlug] || [];
      if (chaps.length === 0 && activeCategoryTab === 'syllabus') {
        setActiveCategoryTab('notes');
      }
    } else {
      // As a graceful default, capitalize slug so UI displays the requested room
      const formattedName = subjectSlug.charAt(0).toUpperCase() + subjectSlug.slice(1);
      setActiveRoom(formattedName);
    }

    if (segments.length >= 2) {
      const pdfSlug = decodeURIComponent(segments.slice(1).join('/'));
      setPendingPdfSlug(pdfSlug);
    } else {
      setReadingDoc(null);
      setPendingPdfSlug(null);
    }
  };

  useEffect(() => {
    syncWithUrl();
    window.addEventListener('popstate', syncWithUrl);
    return () => window.removeEventListener('popstate', syncWithUrl);
  }, [availableSubjects, documents]);

  // Hydrate readingDoc when documents load and pendingPdfSlug is present
  useEffect(() => {
    if (!pendingPdfSlug || documents.length === 0) return;
    const target = pendingPdfSlug.trim().toLowerCase();
    const doc = documents.find(
      (d) =>
        (d.originalName || '').trim().toLowerCase() === target ||
        d.name.trim().toLowerCase() === target ||
        d.id.trim().toLowerCase() === target ||
        encodeURIComponent(d.originalName || d.name).toLowerCase() === target ||
        (d.originalName || '').toLowerCase().includes(target) ||
        target.includes((d.originalName || '').toLowerCase())
    );
    if (doc) {
      setReadingDoc(doc);
      if (!activeRoom) {
        setActiveRoom(doc.subject);
      }
      setPendingPdfSlug(null);
    }
  }, [documents, pendingPdfSlug, activeRoom]);

  // Navigate into a subject room
  const handleSelectRoom = (subjectName: string) => {
    setActiveRoom(subjectName);
    setReadingDoc(null);

    // Auto-select the tab with content so students immediately see their PDFs
    const roomDocs = documents.filter((doc) => matchSubjectDoc(subjectName, doc.subject || ''));
    const hasTextbooks = roomDocs.some((d) => d.category === 'textbook');
    const hasNotes = roomDocs.some((d) => d.category !== 'textbook');
    if (hasNotes && !hasTextbooks) {
      setActiveCategoryTab('notes');
    } else if (hasTextbooks) {
      setActiveCategoryTab('textbooks');
    } else {
      setActiveCategoryTab('notes');
    }

    const slug = getSubjectSlug(subjectName);
    const targetUrl = `/studyroom/${slug}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }
  };

  // Open a document inside reader
  const handleOpenDoc = (doc: ServerDocument) => {
    setReadingDoc(doc);
    setIsPdfLoading(true);
    if (!activeRoom) {
      setActiveRoom(doc.subject);
    }
    const slug = getSubjectSlug(doc.subject || activeRoom || 'room');
    const docName = doc.name || doc.originalName || 'document';
    const targetUrl = `/studyroom/${slug}/${encodeURIComponent(docName)}`;
    if (window.location.pathname !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }
  };

  // Close reader and return to current subject room
  const handleCloseReader = () => {
    setReadingDoc(null);
    const currentSub = activeRoom || readingDoc?.subject;
    const slug = currentSub ? getSubjectSlug(currentSub) : '';
    const targetUrl = slug ? `/studyroom/${slug}` : '/studyroom';
    if (window.location.pathname !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }
  };

  // Exit subject room and return to Study Desk overview
  const handleBackToOverview = () => {
    setActiveRoom(null);
    setReadingDoc(null);
    const targetUrl = '/studyroom';
    if (window.location.pathname !== targetUrl) {
      window.history.pushState(null, '', targetUrl);
    }
  };

  // Segregate room documents into Textbooks and Notes
  const textbookDocs = useMemo(() => {
    return roomDocuments.filter((d) => d.category === 'textbook');
  }, [roomDocuments]);

  const notesDocs = useMemo(() => {
    return roomDocuments.filter((d) => d.category !== 'textbook');
  }, [roomDocuments]);

  // PYQ Past Papers for active room
  const roomPyqPapers = useMemo(() => {
    if (!activeRoom) return [];
    return testPapers.filter((p) => matchSubjectDoc(activeRoom, p.subject || ''));
  }, [testPapers, activeRoom]);

  // Active Subject Meta
  const currentRoomMeta = useMemo(() => {
    return availableSubjects.find(
      (s) => s.name.toLowerCase() === (activeRoom || '').toLowerCase()
    );
  }, [availableSubjects, activeRoom]);

  // Active Subject Slug & Official Chapters Portion
  const activeSubjectSlug = useMemo(() => {
    return activeRoom ? getSubjectSlug(activeRoom) : '';
  }, [activeRoom]);

  const activeRoomChapters: ChapterItem[] = useMemo(() => {
    if (!activeSubjectSlug) return [];
    const stdDict = ALL_SYLLABUS_CHAPTERS[effectiveStandard] || ALL_SYLLABUS_CHAPTERS['12'];
    const standardChapters = stdDict?.[activeSubjectSlug];
    if (standardChapters && standardChapters.length > 0) {
      return standardChapters;
    }

    // Dynamic chapter synthesis only if official chapters are not configured
    const synthesizedMap = new Map<string, ChapterItem>();
    roomDocuments.forEach((doc) => {
      const dName = doc.originalName || doc.name;
      const chMatch = dName.match(/(?:chapter|chpt|chp|ch)\s*[-_.]?\s*0?(\d+)/i);
      if (chMatch) {
        const num = `Chapter ${chMatch[1]}`;
        if (!synthesizedMap.has(num)) {
          synthesizedMap.set(num, {
            number: num,
            title: dName.replace(/\.pdf$/i, '').replace(/^[0-9\s_-]+/, '').trim() || `${num} Topics`,
            keyTopics: 'Curriculum topics from uploaded study document',
          });
        }
      }
    });

    if (synthesizedMap.size > 0) {
      return Array.from(synthesizedMap.values()).sort((a, b) => {
        const numA = parseInt(a.number.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.number.replace(/\D/g, '') || '0', 10);
        return numA - numB;
      });
    }

    return [];
  }, [activeSubjectSlug, effectiveStandard, roomDocuments]);

  // Selected Chapter filter for Notes and Textbooks tabs
  const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>('All');

  // Filter documents by selected chapter
  const filteredNotesDocs = useMemo(() => {
    if (selectedChapterFilter === 'All') return notesDocs;
    const targetChapter = activeRoomChapters.find((ch) => ch.number === selectedChapterFilter);
    if (!targetChapter) return notesDocs;
    return notesDocs.filter((d) => getDocsForChapter(targetChapter, [d], effectiveStandard).length > 0);
  }, [notesDocs, selectedChapterFilter, activeRoomChapters, effectiveStandard]);

  const filteredTextbookDocs = useMemo(() => {
    if (selectedChapterFilter === 'All') return textbookDocs;
    const targetChapter = activeRoomChapters.find((ch) => ch.number === selectedChapterFilter);
    if (!targetChapter) return textbookDocs;
    return textbookDocs.filter((d) => getDocsForChapter(targetChapter, [d], effectiveStandard).length > 0);
  }, [textbookDocs, selectedChapterFilter, activeRoomChapters, effectiveStandard]);

  const chaptersMasteredCount = useMemo(() => {
    return activeRoomChapters.filter(
      (ch) => !!completedChapters[`${activeSubjectSlug}-${ch.number}`]
    ).length;
  }, [activeRoomChapters, completedChapters, activeSubjectSlug]);

  // Toggle chapter completion
  const toggleChapter = (chapterKey: string) => {
    setCompletedChapters((prev) => {
      const next = { ...prev, [chapterKey]: !prev[chapterKey] };
      try {
        localStorage.setItem('aether_chapter_progress', JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save chapter progress:', err);
      }
      return next;
    });
  };

  const handleMarkAllChapters = () => {
    setCompletedChapters((prev) => {
      const next = { ...prev };
      activeRoomChapters.forEach((ch) => {
        next[`${activeSubjectSlug}-${ch.number}`] = true;
      });
      try {
        localStorage.setItem('aether_chapter_progress', JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save chapter progress:', err);
      }
      return next;
    });
  };

  const handleResetChapters = () => {
    setCompletedChapters((prev) => {
      const next = { ...prev };
      activeRoomChapters.forEach((ch) => {
        delete next[`${activeSubjectSlug}-${ch.number}`];
      });
      try {
        localStorage.setItem('aether_chapter_progress', JSON.stringify(next));
      } catch (err) {
        console.warn('Failed to save chapter progress:', err);
      }
      return next;
    });
  };

  // Download URL Helper
  const getDownloadUrl = (doc: ServerDocument) => {
    if (doc.streamUrl && doc.streamUrl.includes('drive.google.com/file/d/')) {
      const match = doc.streamUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }
    if (doc.id && !doc.id.startsWith('doc-') && !doc.id.startsWith('local-')) {
      return `https://drive.google.com/uc?export=download&id=${doc.id}`;
    }
    return doc.serverUrl || doc.streamUrl || '';
  };

  // Delete Document Handler
  const handleDeleteDocument = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this study document?')) return;

    try {
      await api.deleteDocument(id, currentUser?.email);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (readingDoc?.id === id) handleCloseReader();
    } catch (err: any) {
      alert(err.message || 'Failed to remove document.');
    }
  };

  // Handle Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a PDF document.');
      return;
    }

    if (!canUpload) {
      setUploadError('Only administrators or account owner can upload documents.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);

      const targetSub = uploadSubject || activeRoom || availableSubjects[0]?.name || 'General';
      const targetStd = isSuperAdmin ? uploadStandard : (currentUser?.standard || activeStandard || '12');

      let uploadedRecord: ServerDocument;

      // 1. Attempt Direct Google Drive Upload first
      let driveResult: any = null;
      try {
        driveResult = await uploadDirectToGoogleDrive(
          selectedFile,
          targetSub,
          currentUser?.email || 'admin'
        );
      } catch (driveErr: any) {
        console.warn('Direct Google Drive upload error, falling back to server upload:', driveErr);
      }

      if (driveResult && driveResult.id) {
        // Direct Google Drive upload succeeded! The file is safely in Google Drive
        const driveDoc: ServerDocument = {
          id: driveResult.id,
          name: driveResult.name || selectedFile.name,
          originalName: selectedFile.name,
          streamUrl: driveResult.streamUrl || `https://drive.google.com/file/d/${driveResult.id}/preview`,
          serverUrl: driveResult.streamUrl || `https://drive.google.com/file/d/${driveResult.id}/preview`,
          mimeType: selectedFile.type || 'application/pdf',
          sizeBytes: selectedFile.size,
          size: driveResult.size || `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
          uploadedAt: driveResult.uploadedAt || new Date().toISOString(),
          uploadedBy: currentUser?.email || 'admin',
          subject: targetSub,
          standard: targetStd,
          category: uploadCategory,
          uploadCount: 1,
        };

        // Attach & sync with server database (non-blocking, client cache is guaranteed)
        try {
          const attachRes = await api.attachDriveDoc(targetSub, driveDoc);
          uploadedRecord = attachRes.document || driveDoc;
        } catch (syncErr) {
          console.warn('Server sync notice:', syncErr);
          uploadedRecord = driveDoc;
        }
      } else {
        // Fallback 1: Try backend Google Drive storage proxy
        try {
          const driveRes = await api.uploadToGoogleDrive(
            selectedFile,
            targetSub,
            currentUser?.email || 'admin'
          );
          if (driveRes && driveRes.document) {
            uploadedRecord = driveRes.document;
          } else {
            throw new Error('Proxy upload returned no document');
          }
        } catch {
          // Fallback 2: Try standard server upload endpoint
          try {
            uploadedRecord = await api.uploadDocument(
              selectedFile,
              targetSub,
              currentUser?.email || 'admin',
              targetStd,
              uploadCategory
            );
          } catch {
            // Fallback 3: Client resilient instant document (never blocks user)
            const localId = `doc-${Date.now()}`;
            const localUrl = URL.createObjectURL(selectedFile);
            uploadedRecord = {
              id: localId,
              name: selectedFile.name,
              originalName: selectedFile.name,
              streamUrl: localUrl,
              serverUrl: localUrl,
              mimeType: selectedFile.type || 'application/pdf',
              sizeBytes: selectedFile.size,
              size: `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`,
              uploadedAt: new Date().toISOString(),
              uploadedBy: currentUser?.email || 'admin',
              subject: targetSub,
              standard: targetStd,
              category: uploadCategory,
              uploadCount: 1,
            };
          }
        }
      }

      setDocuments((prev) => [uploadedRecord, ...prev]);
      setUploadSuccess(true);
      setSelectedFile(null);
      setUploadTitle('');
      setTimeout(() => {
        setUploadSuccess(false);
        setShowUploadModal(false);
      }, 1500);
    } catch (err: any) {
      setUploadError(err.message || 'Upload operation failed. Please check network.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 select-text">
      {/* ========================================================
          VIEW 1: DISTRACTION-FREE PDF READER
      ======================================================== */}
      {readingDoc ? (
        <div className="flex flex-col h-full w-full overflow-hidden animate-fade-in bg-slate-950">
          <UniversalPdfViewer
            url={readingDoc.streamUrl || readingDoc.serverUrl || ''}
            title={readingDoc.name || readingDoc.originalName}
            subtitle={`${readingDoc.subject} • Class ${toRomanStandard(readingDoc.standard || activeStandard)}`}
            onClose={handleCloseReader}
            backLabel={`Back to ${readingDoc.subject}`}
            className="w-full h-full"
          />
        </div>
      ) : activeRoom ? (
        /* ========================================================
            VIEW 2: INSIDE A SPECIFIC SUBJECT ROOM
        ======================================================== */
        <div className="flex flex-col h-full w-full overflow-y-auto animate-fade-in p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
          {/* Room Header Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative shrink-0 min-h-fit">
            <div className="flex items-center space-x-3.5 sm:space-x-4 min-w-0 flex-1">
              <button
                onClick={handleBackToOverview}
                className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shrink-0"
                title="Back to all subjects"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 shrink-0">
                {currentRoomMeta ? (
                  <currentRoomMeta.icon className="w-6 h-6" />
                ) : (
                  <BookOpen className="w-6 h-6" />
                )}
              </div>

              <div className="min-w-0 flex-1 py-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-normal">
                    {activeRoom}
                  </h2>
                  {activeStandard === 'ALL' ? (
                    <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 ml-1">
                      <button
                        type="button"
                        onClick={() => setRoomStandardView('12')}
                        className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                          roomStandardView === '12'
                            ? 'bg-brand-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Class 12 (HSC)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoomStandardView('11')}
                        className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                          roomStandardView === '11'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        Class 11 (FYJC)
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200 dark:border-brand-800 shrink-0">
                      Class {toRomanStandard(effectiveStandard)} • {effectiveStandard === '12' ? 'HSC' : 'FYJC'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {currentRoomMeta?.description || 'Dedicated Subject Room • Textbooks & Study Materials'}
                </p>
              </div>
            </div>

            {/* Quick Room Actions */}
            <div className="flex items-center space-x-2 shrink-0 self-start md:self-center">
              {canUpload && (
                <>
                  <button
                    onClick={() => {
                      setUploadSubject(activeRoom);
                      setShowUploadModal(true);
                    }}
                    className="px-3.5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/25 flex items-center space-x-1.5 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkModal(true);
                    }}
                    className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/25 flex items-center space-x-1.5 transition-all"
                    title="Upload complete folder of study notes or test papers"
                  >
                    <FolderUp className="w-4 h-4" />
                    <span>Upload Folder</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Subject Room Sub-Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
            <button
              onClick={() => setActiveCategoryTab('syllabus')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCategoryTab === 'syllabus'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              <span>Official Chapter Syllabus</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  activeCategoryTab === 'syllabus'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {activeRoomChapters.length > 0 ? `${chaptersMasteredCount}/${activeRoomChapters.length}` : 'Chapters'}
              </span>
            </button>

            <button
              onClick={() => setActiveCategoryTab('textbooks')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCategoryTab === 'textbooks'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Textbook PDFs</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  activeCategoryTab === 'textbooks'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {textbookDocs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveCategoryTab('notes')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCategoryTab === 'notes'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Study Notes & Lecture Materials</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  activeCategoryTab === 'notes'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {notesDocs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveCategoryTab('pyq')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCategoryTab === 'pyq'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/25'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Board Exam Papers (PYQ)</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  activeCategoryTab === 'pyq'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {roomPyqPapers.length}
              </span>
            </button>
          </div>

          {/* Material Cards Section */}
          <div>
            {activeCategoryTab === 'syllabus' ? (
              /* TAB 1: OFFICIAL CHAPTER SYLLABUS & CHECKLIST */
              <div className="space-y-6 animate-fade-in">
                {/* Syllabus Progress Card */}
                <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-brand-500/10 via-brand-600/5 to-transparent border border-brand-200 dark:border-brand-900/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800 tracking-wide uppercase">
                        Maharashtra State Board Portion (Class 12)
                      </span>
                      {chaptersMasteredCount === activeRoomChapters.length && activeRoomChapters.length > 0 && (
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 100% Completed!
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {activeRoom} Chapter Mastery
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Track and master every chapter from the official HSC commerce syllabus.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
                    {/* Mastery Bar */}
                    <div className="w-full sm:w-56 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>Mastery</span>
                        <span>
                          {chaptersMasteredCount} / {activeRoomChapters.length} Chapters (
                          {activeRoomChapters.length > 0
                            ? Math.round((chaptersMasteredCount / activeRoomChapters.length) * 100)
                            : 0}
                          %)
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-brand-600 to-emerald-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${
                              activeRoomChapters.length > 0
                                ? (chaptersMasteredCount / activeRoomChapters.length) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Quick batch actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleMarkAllChapters}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs"
                        title="Mark all chapters as mastered"
                      >
                        Mark All
                      </button>
                      <button
                        onClick={handleResetChapters}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-2xs"
                        title="Reset progress"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>

                {/* Chapter List */}
                {isLoading ? (
                  <CardSkeleton count={6} />
                ) : activeRoomChapters.length === 0 ? (
                  <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto border border-brand-100 dark:border-brand-900">
                      <ListChecks className="w-7 h-7" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Curriculum Syllabus Available
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Visit the curriculum tracker or upload reference materials for {activeRoom}.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {activeRoomChapters.map((ch) => {
                      const chapterKey = `${activeSubjectSlug}-${ch.number}`;
                      const isCompleted = !!completedChapters[chapterKey];
                      const chapterDocs = getDocsForChapter(ch, roomDocuments, effectiveStandard);

                      return (
                        <div
                          key={ch.number + ch.title}
                          className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                            isCompleted
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-brand-500/50 dark:hover:border-brand-500/50 hover:shadow-md'
                          }`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                  isCompleted
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {ch.number}
                              </span>

                              {ch.part && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  {ch.part}
                                </span>
                              )}

                              <div className="ml-auto">
                                <button
                                  type="button"
                                  onClick={() => toggleChapter(chapterKey)}
                                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-all ${
                                    isCompleted
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}
                                  title="Click to toggle mastery status"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>{isCompleted ? 'Mastered' : 'Mark Done'}</span>
                                </button>
                              </div>
                            </div>

                            <h4
                              className={`text-sm font-bold leading-snug transition-colors ${
                                isCompleted
                                  ? 'text-emerald-950 dark:text-emerald-100 line-through decoration-emerald-500/40'
                                  : 'text-slate-900 dark:text-white'
                              }`}
                            >
                              {ch.title}
                            </h4>

                            {ch.keyTopics && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                <span className="font-semibold text-slate-600 dark:text-slate-300">Topics:</span>{' '}
                                {ch.keyTopics}
                              </p>
                            )}

                            {/* Connected Chapter PDF Documents & Notes */}
                            <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-brand-500" />
                                  <span>Chapter Study PDFs:</span>
                                </span>
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                    chapterDocs.length > 0
                                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300 border border-brand-200 dark:border-brand-800'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {chapterDocs.length > 0
                                    ? `${chapterDocs.length} PDF${chapterDocs.length === 1 ? '' : 's'}`
                                    : '0 PDFs'}
                                </span>
                              </div>

                              {chapterDocs.length > 0 ? (
                                <div className="space-y-1.5">
                                  {chapterDocs.slice(0, 2).map((doc) => {
                                    const docKey = getCanonicalDocKey(doc.streamUrl || doc.serverUrl || doc.name, doc.originalName || doc.name);
                                    const progress = readingMemory.getProgress(docKey);
                                    const hasProgress = progress && progress.currentPage > 1;

                                    return (
                                      <div
                                        key={doc.id}
                                        onClick={() => handleOpenDoc(doc)}
                                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-brand-50 dark:bg-slate-800/60 dark:hover:bg-brand-950/40 border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer group/doc"
                                        title={`Read ${doc.originalName || doc.name}`}
                                      >
                                        <div className="flex items-center space-x-2 truncate mr-2">
                                          <BookOpen className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover/doc:text-brand-600 dark:group-hover/doc:text-brand-400 truncate">
                                            {doc.name || doc.originalName}
                                          </span>
                                        </div>

                                        <div className="flex items-center space-x-1.5 shrink-0">
                                          {hasProgress && (
                                            <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                              <History className="w-2.5 h-2.5" /> p.{progress.currentPage}
                                            </span>
                                          )}
                                          <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg text-white shadow-xs flex items-center gap-1 ${
                                              hasProgress ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-brand-600 hover:bg-brand-500'
                                            }`}
                                          >
                                            <Eye className="w-3 h-3" /> {hasProgress ? 'Resume' : 'Read'}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {chapterDocs.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedChapterFilter(ch.number);
                                        setActiveCategoryTab('notes');
                                      }}
                                      className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline pt-0.5 block"
                                    >
                                      View all {chapterDocs.length} chapter notes →
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                                  <span>No notes uploaded for this chapter</span>
                                  {canUpload && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUploadSubject(activeRoom);
                                        setUploadTitle(`${activeRoom} - ${ch.number}: ${ch.title}`);
                                        setShowUploadModal(true);
                                      }}
                                      className="text-brand-600 dark:text-brand-400 font-bold hover:underline"
                                    >
                                      + Upload
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeCategoryTab === 'textbooks' ? (
              /* TAB 2: TEXTBOOKS */
              isLoading ? (
                <CardSkeleton count={3} />
              ) : textbookDocs.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-100 dark:border-blue-900">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    No Textbook PDFs Uploaded Yet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Official curriculum textbooks and reference guides for {activeRoom} (Class {activeStandard}) will appear here.
                  </p>
                  {notesDocs.length > 0 && (
                    <div className="pt-2">
                      <button
                        onClick={() => setActiveCategoryTab('notes')}
                        className="px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 dark:hover:bg-brand-900/60 text-xs font-bold rounded-xl border border-brand-200 dark:border-brand-800 transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                        <span>View {notesDocs.length} Study Notes & Chapter PDFs for {activeRoom}</span>
                      </button>
                    </div>
                  )}
                  {canUpload && (
                    <button
                      onClick={() => {
                        setUploadSubject(activeRoom);
                        setUploadCategory('textbook');
                        setShowUploadModal(true);
                      }}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      Upload Textbook PDF
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Chapter Filter Bar for Textbooks */}
                  {activeRoomChapters.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chapter:</span>
                        <select
                          value={selectedChapterFilter}
                          onChange={(e) => setSelectedChapterFilter(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                        >
                          <option value="All">All Chapters ({textbookDocs.length} Textbooks)</option>
                          {activeRoomChapters.map((ch) => (
                            <option key={ch.number} value={ch.number}>
                              {ch.number}: {ch.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      {selectedChapterFilter !== 'All' && (
                        <button
                          onClick={() => setSelectedChapterFilter('All')}
                          className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          Show All Chapters
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTextbookDocs.map((doc) => {
                      const matchedCh = activeRoomChapters.find((ch) => getDocsForChapter(ch, [doc], effectiveStandard).length > 0);
                      const docKey = getCanonicalDocKey(doc.streamUrl || doc.serverUrl || doc.name, doc.originalName || doc.name);
                      const progress = readingMemory.getProgress(docKey);
                      const hasProgress = progress && progress.currentPage > 1;

                      return (
                        <div
                          key={doc.id}
                          onClick={() => handleOpenDoc(doc)}
                          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 dark:hover:border-brand-500/50 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900">
                                <BookOpen className="w-5 h-5" />
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                {matchedCh && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    {matchedCh.number}
                                  </span>
                                )}

                                {hasProgress && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                    <History className="w-2.5 h-2.5" /> p.{progress.currentPage} ({progress.percent}%)
                                  </span>
                                )}

                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  Official Textbook
                                </span>
                              </div>
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2 leading-snug">
                              {doc.name || doc.originalName}
                            </h4>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
                              <span>{doc.size || `${((doc.sizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB`}</span>
                              <span>•</span>
                              <span>Class {toRomanStandard(doc.standard || activeStandard)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 dark:border-slate-800">
                            {hasProgress ? (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" /> Resume Page {progress.currentPage}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" /> Read PDF
                              </span>
                            )}

                            <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                              <a
                                href={getDownloadUrl(doc)}
                                target="_blank"
                                rel="noreferrer"
                                download={doc.originalName || doc.name}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Download PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              {canUpload && (
                                <button
                                  onClick={(e) => handleDeleteDocument(doc.id, e)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                  title="Delete from room"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ) : activeCategoryTab === 'notes' ? (
              /* TAB 3: STUDY NOTES & MATERIALS */
              isLoading ? (
                <CardSkeleton count={6} />
              ) : notesDocs.length === 0 ? (
                <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-100 dark:border-amber-900">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    No Study Notes Uploaded Yet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Lecture summaries, revision formula sheets, and chapter notes for {activeRoom} (Class {activeStandard}) will appear here.
                  </p>
                  {canUpload && (
                    <button
                      onClick={() => {
                        setUploadSubject(activeRoom);
                        setUploadCategory('notes');
                        setShowUploadModal(true);
                      }}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      Upload Study Notes
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Chapter Filter Bar for Study Notes */}
                  {activeRoomChapters.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chapter:</span>
                        <select
                          value={selectedChapterFilter}
                          onChange={(e) => setSelectedChapterFilter(e.target.value)}
                          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer"
                        >
                          <option value="All">All Chapters ({notesDocs.length} Notes)</option>
                          {activeRoomChapters.map((ch) => {
                            const count = getDocsForChapter(ch, notesDocs, effectiveStandard).length;
                            return (
                              <option key={ch.number} value={ch.number}>
                                {ch.number}: {ch.title} ({count} {count === 1 ? 'PDF' : 'PDFs'})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      {selectedChapterFilter !== 'All' && (
                        <button
                          onClick={() => setSelectedChapterFilter('All')}
                          className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          Show All Chapters
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredNotesDocs.map((doc) => {
                      const matchedCh = activeRoomChapters.find((ch) => getDocsForChapter(ch, [doc], effectiveStandard).length > 0);
                      const docKey = getCanonicalDocKey(doc.streamUrl || doc.serverUrl || doc.name, doc.originalName || doc.name);
                      const progress = readingMemory.getProgress(docKey);
                      const hasProgress = progress && progress.currentPage > 1;

                      return (
                        <div
                          key={doc.id}
                          onClick={() => handleOpenDoc(doc)}
                          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 dark:hover:border-brand-500/50 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900">
                                <FileText className="w-5 h-5" />
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                {matchedCh && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                                    {matchedCh.number}
                                  </span>
                                )}

                                {hasProgress && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                    <History className="w-2.5 h-2.5" /> p.{progress.currentPage} ({progress.percent}%)
                                  </span>
                                )}

                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  Study Material
                                </span>

                                {/* Super Admin Upload Count Tracker */}
                                {isSuperAdmin && (
                                  <span
                                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                                    title="Number of times this document has been uploaded"
                                  >
                                    {doc.uploadCount || 1} {doc.uploadCount === 1 ? 'upload' : 'uploads'}
                                  </span>
                                )}
                              </div>
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-2 leading-snug">
                              {doc.name || doc.originalName}
                            </h4>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
                              <span>{doc.size || `${((doc.sizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB`}</span>
                              <span>•</span>
                              <span>Class {toRomanStandard(doc.standard || activeStandard)}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 mt-3 border-t border-slate-100 dark:border-slate-800">
                            {hasProgress ? (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" /> Resume Page {progress.currentPage}
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                                <Eye className="w-3.5 h-3.5" /> Read Notes
                              </span>
                            )}

                            <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                              <a
                                href={getDownloadUrl(doc)}
                                target="_blank"
                                rel="noreferrer"
                                download={doc.originalName || doc.name}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Download PDF"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              {canUpload && (
                                <button
                                  onClick={(e) => handleDeleteDocument(doc.id, e)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                  title="Delete from room"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            ) : activeCategoryTab === 'pyq' ? (
                /* TAB 4: BOARD EXAM PAPERS & SOLUTIONS (PYQ) */
                roomPyqPapers.length === 0 ? (
                  <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto border border-purple-100 dark:border-purple-900">
                      <GraduationCap className="w-7 h-7" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      No Past Exam Papers Found for {activeRoom}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Official board question papers and model answer keys will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roomPyqPapers.map((paper) => (
                      <div
                        key={paper.id}
                        className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-purple-500 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {paper.year} Board Exam
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {paper.examType || 'PYQ'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                            {paper.title}
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            {paper.totalMarks || 80} Marks • {paper.durationMinutes || 180} Mins
                          </p>
                        </div>

                        <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleOpenDoc({
                              id: paper.id,
                              name: paper.title + ' (Question Paper)',
                              originalName: paper.questionPdfName,
                              streamUrl: paper.questionPdfUrl,
                              serverUrl: paper.questionPdfUrl,
                              subject: paper.subject,
                              standard: '12',
                              category: 'notes',
                              uploadedBy: paper.uploadedBy,
                              uploadedAt: paper.uploadedAt,
                            })}
                            className={`py-2 px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all ${
                              paper.answerKeyPdfUrl && paper.answerKeyPdfUrl.trim() !== '' && paper.answerKeyPdfUrl !== paper.questionPdfUrl
                                ? 'flex-1'
                                : 'w-full'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Question Paper</span>
                          </button>
                          {paper.answerKeyPdfUrl && paper.answerKeyPdfUrl.trim() !== '' && paper.answerKeyPdfUrl !== paper.questionPdfUrl && (
                            <button
                              onClick={() => handleOpenDoc({
                                id: paper.id + '-sol',
                                name: paper.title + ' (Solution Key)',
                                originalName: paper.answerKeyPdfName,
                                streamUrl: paper.answerKeyPdfUrl,
                                serverUrl: paper.answerKeyPdfUrl,
                                subject: paper.subject,
                                standard: '12',
                                category: 'notes',
                                uploadedBy: paper.uploadedBy,
                                uploadedAt: paper.uploadedAt,
                              })}
                              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Model Solution</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : null
            }
          </div>
        </div>
      ) : (
        /* ========================================================
            VIEW 3: SUBJECT ROOMS OVERVIEW GRID (DESK HOME)
        ======================================================== */
        <div className="flex flex-col h-full w-full overflow-y-auto p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
          {/* Header Title Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Subject Rooms
                </h2>
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/80 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                  Standard {activeStandard}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Choose a subject room to access official textbook PDFs and curated study materials for Class {activeStandard}.
              </p>
            </div>

            {canUpload && (
              <div className="flex items-center space-x-2 self-start sm:self-auto">
                <button
                  onClick={() => {
                    setUploadSubject(availableSubjects[0]?.name || 'General');
                    setShowUploadModal(true);
                  }}
                  className="px-3.5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/25 flex items-center space-x-1.5 transition-all"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload File</span>
                </button>
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/25 flex items-center space-x-1.5 transition-all"
                  title="Bulk upload and auto-segregate complete folders of study materials"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Bulk Auto-Segregate</span>
                </button>
              </div>
            )}
          </div>

          {/* Subject Rooms Grid */}
          {isLoading ? (
            <CardSkeleton count={6} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {availableSubjects.map((sub) => {
                const Icon = sub.icon;
                const directDocs = standardFilteredDocuments.filter(
                  (d) => matchSubjectDoc(sub.name, d.subject || '')
                );
                const subDocs = directDocs.length > 0
                  ? directDocs
                : documents.filter((d) => matchSubjectDoc(sub.name, d.subject || ''));
              const tBooks = subDocs.filter((d) => d.category === 'textbook').length;
              const nDocs = subDocs.filter((d) => d.category !== 'textbook').length;

              return (
                <div
                  key={sub.name}
                  onClick={() => handleSelectRoom(sub.name)}
                  className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500/60 dark:hover:border-brand-500/60 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${sub.colorGradient} flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>

                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${sub.badgeColor}`}>
                        {sub.code}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {sub.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {sub.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span className="font-bold text-slate-800 dark:text-slate-200">{tBooks}</span> Textbooks • <span className="font-bold text-slate-800 dark:text-slate-200">{nDocs}</span> Notes
                    </div>

                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400 group-hover:translate-x-0.5 transition-transform">
                      Enter Room →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      )}

      {/* ========================================================
          UPLOAD MODAL (Super Admin & Admin Only)
      ======================================================== */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Upload PDF Material
                </h3>
              </div>

              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadError(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
              {/* File Selection */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Study Document or Note (PDF, Word, Text, Images)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-brand-500 cursor-pointer text-center bg-slate-50 dark:bg-slate-800/50 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.rtf,.epub,.html,.htm,.png,.jpg,.jpeg,.webp,.svg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0];
                        setSelectedFile(file);
                        if (!uploadTitle) setUploadTitle(file.name.replace(/\.[a-zA-Z0-9]+$/i, ''));
                      }
                    }}
                  />
                  {selectedFile ? (
                    <div className="text-slate-800 dark:text-slate-200 font-bold truncate">
                      {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                    </div>
                  ) : (
                    <div className="text-slate-500 dark:text-slate-400">
                      <Upload className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                      <span>Click to select PDF or study document</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setShowBulkModal(true);
                    }}
                    className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline inline-flex items-center gap-1.5 cursor-pointer py-1"
                  >
                    <FolderUp className="w-3.5 h-3.5" />
                    <span>Want to upload a complete folder instead? Click here</span>
                  </button>
                </div>
              </div>

              {/* Category Selector: Textbook vs Notes */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Document Section
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadCategory('textbook')}
                    className={`py-2 px-3 rounded-xl border text-left font-bold transition-all flex items-center gap-2 ${
                      uploadCategory === 'textbook'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>📚 Textbook PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadCategory('notes')}
                    className={`py-2 px-3 rounded-xl border text-left font-bold transition-all flex items-center gap-2 ${
                      uploadCategory === 'notes'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <FileText className="w-4 h-4 shrink-0" />
                    <span>📝 Study Notes</span>
                  </button>
                </div>
              </div>

              {/* Academic Standard Target */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Standard
                </label>
                {isSuperAdmin ? (
                  <select
                    value={uploadStandard}
                    onChange={(e) => setUploadStandard(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="12">Standard 12 (HSC Senior Secondary)</option>
                    <option value="10">Standard 10 (SSC Board Examination)</option>
                    <option value="11">Standard 11 (FYJC Junior College)</option>
                    <option value="9">Standard 9 (Class IX Foundation)</option>
                    <option value="ALL">ALL Standards (Universal Material)</option>
                  </select>
                ) : (
                  <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-xl px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    Standard {currentUser?.standard || activeStandard} (Enrolled Admin Grade)
                  </div>
                )}
              </div>

              {/* Subject Room Target */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Subject Room
                </label>
                <select
                  value={uploadSubject || (availableSubjects[0]?.name || 'General')}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {availableSubjects.map((sub) => (
                    <option key={sub.name} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-brand-500/25 flex items-center justify-center space-x-1.5 transition-all mt-2"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Uploading PDF Material...</span>
                  </>
                ) : uploadSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-300" />
                    <span>Upload Completed!</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Confirm & Upload PDF</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Intelligent Bulk Uploader Modal */}
      {showBulkModal && (
        <BulkUploaderModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          defaultCategory="notes"
          onUploadSuccess={loadContent}
        />
      )}
    </div>
  );
};

export default SubjectRooms;

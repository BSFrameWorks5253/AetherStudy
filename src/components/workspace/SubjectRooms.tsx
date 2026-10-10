import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, ServerDocument } from '../../services/api';
import { getUserStorageItem, setUserStorageItem } from '../../utils/userStorage';
import { TestPaper } from '../../types/testPaper';
import { deleteFromGoogleDrive } from '../../services/clientGoogleDrive';
import { firebaseDocuments, firebaseDeletedDocs } from '../../services/firebase';
import { pdfVault } from '../../services/pdfVault';
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
  Search,
  Tag,
  Grid,
  List,
  Check,
  X,
  Edit3,
  ChevronDown,
  ChevronUp,
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

// URL Slug Mapping Helpers with Strict Token Boundary Isolation (Zero Cross-Subject Contamination)
export const getSubjectSlug = (name: string): string => {
  if (!name) return 'general';
  const lower = name.toLowerCase().trim();

  // 1. Direct canonical slug match
  if (lower === 'accounts' || lower === 'bk') return 'accounts';
  if (lower === 'ocm') return 'ocm';
  if (lower === 'eco' || lower === 'economics') return 'eco';
  if (lower === 'maths' || lower === 'math') return 'maths';
  if (lower === 'english' || lower === 'eng') return 'english';
  if (lower === 'it') return 'it';
  if (lower === 'sp') return 'sp';
  if (lower === 'hindi') return 'hindi';
  if (lower === 'marathi') return 'marathi';

  // 2. Strict word boundary isolation (never matches substrings like 'it' in 'unit/credit' or 'sp' in 'transport')
  if (/\b(hindi|hin-xii)\b/i.test(lower)) return 'hindi';
  if (/\b(marathi|mar-xii)\b/i.test(lower)) return 'marathi';
  if (/\b(english|yuvakbharati|eng-xii)\b/i.test(lower)) return 'english';
  if (/\b(book[-\s]?keeping|account(s|ancy|ing)?|b\.?k\.?|bk-xii)\b/i.test(lower)) return 'accounts';
  if (/\b(ocm|organi[sz]ation\s*(of)?\s*commerce|commerce\s*(&|and)\s*management|principles\s*of\s*management|ocm-xii)\b/i.test(lower)) return 'ocm';
  if (/\b(economic(s)?|eco|microeconomics|macroeconomics|micro-economics|macro-economics|eco-xii)\b/i.test(lower)) return 'eco';
  if (/\b(math(s|ematic(s)?)?|statistic(s)?|calculus|math-xii)\b/i.test(lower)) return 'maths';
  if (/\b(information\s+technology|info\s*tech(nology)?|i\.t\.|it-xii|\(it\))\b/i.test(lower) || lower === 'it') return 'it';
  if (/\b(secretarial\s+practice|s\.p\.|sp-xii|\(sp\))\b/i.test(lower) || lower === 'sp') return 'sp';

  return lower.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'general';
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

// Strict Subject Matching Engine (Completely prevents any subject leakage)
export const matchSubjectDoc = (roomName: string, docSubject: string): boolean => {
  if (!roomName || !docSubject) return false;
  const rTrim = roomName.trim().toLowerCase();
  const dTrim = docSubject.trim().toLowerCase();
  if (rTrim === dTrim) return true;

  const rSlug = getSubjectSlug(roomName);
  const dSlug = getSubjectSlug(docSubject);

  // If either resolved to 'general', only match if raw strings are identical
  if (rSlug === 'general' || dSlug === 'general') {
    return rTrim === dTrim;
  }

  // Strict language isolation: never cross-contaminate Hindi, English, or Marathi
  const languages = ['hindi', 'marathi', 'english'];
  if (languages.includes(rSlug) || languages.includes(dSlug)) {
    return rSlug === dSlug;
  }

  return rSlug === dSlug;
};

export interface ChapterItem {
  number: string;
  title: string;
  part?: string;
  section?: string;
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
    // SECTION ONE (Prose)
    { number: '1.1', title: 'An Astrologer’s Day — R. K. Narayan', section: 'Section 1 (Prose)', keyTopics: 'R. K. Narayan prose, Irony & Human nature, Character study, Guru Nayak encounter' },
    { number: '1.2', title: 'On Saying “Please” — Alfred George Gardiner', section: 'Section 1 (Prose)', keyTopics: 'Social etiquette, Civility & Politeness, Moral vs legal laws, Courtesy in public life' },
    { number: '1.3', title: 'The Cop and the Anthem — O’Henry', section: 'Section 1 (Prose)', keyTopics: 'O’Henry story, Irony & Humour, Soapy’s resolution and Blackwell Island' },
    { number: '1.4', title: 'Big Data - Big Insights', section: 'Section 1 (Prose)', keyTopics: 'Data revolution, Big data analytics, Industry applications, Health & Geo-tracking' },
    { number: '1.5', title: 'The New Dress — Virginia Woolf', section: 'Section 1 (Prose)', keyTopics: 'Stream of consciousness, Mabel Waring, Social insecurity, Self-consciousness' },
    { number: '1.6', title: 'Into the Wild — Kiran Purandare', section: 'Section 1 (Prose)', keyTopics: 'Wildlife safari, Umbarzara, Tracking leopards & birds, Nature conservation & Shaaz Jung' },
    { number: '1.7', title: 'Why we Travel — Siddarth Pico Raghavan Iyer', section: 'Section 1 (Prose)', keyTopics: 'Philosophy of travel, Experiencing cultures, Wonder, Self-discovery & perspective' },
    { number: '1.8', title: 'Voyaging Towards Excellence — Achyut Godbole', section: 'Section 1 (Prose)', keyTopics: 'Journey from IIT to management, Passion for learning, Humility, Teamwork & excellence' },

    // SECTION TWO (Poetry)
    { number: '2.1', title: 'Song of the Open Road — Walt Whitman', section: 'Section 2 (Poetry)', keyTopics: 'Freedom of the road, Optimism, Self-reliance, Democratic spirit, Free verse' },
    { number: '2.2', title: 'Indian Weavers — Sarojini Naidu', section: 'Section 2 (Poetry)', keyTopics: 'Stages of human life (Birth, Youth, Death), Symbolic colors & textiles, Rhyme scheme' },
    { number: '2.3', title: 'The Inchcape Rock — Robert Southey', section: 'Section 2 (Poetry)', keyTopics: 'Ballad, Abbot of Aberbrothok, Sir Ralph the Rover, Poetic justice & retribution' },
    { number: '2.4', title: 'Have you Earned your Tomorrow — Edgar Guest', section: 'Section 2 (Poetry)', keyTopics: 'Kindness, Daily deeds, Moral reflection, Selfless service, Making a difference' },
    { number: '2.5', title: 'Father Returning Home — Dilip Chitre', section: 'Section 2 (Poetry)', keyTopics: 'Alienation, Loneliness of modern urban life, Sub-urban commute, Generation gap' },
    { number: '2.6', title: 'Money — William H. Davies', section: 'Section 2 (Poetry)', keyTopics: 'True wealth, False friends vs genuine poverty, Philosophy of contentment and peace' },
    { number: '2.7', title: 'She Walks in Beauty — George Gordon Byron', section: 'Section 2 (Poetry)', keyTopics: 'Romantic ode, Harmony of light and dark, Physical grace & pure innocent mind' },
    { number: '2.8', title: 'Small Towns and Rivers — Mamang Dai', section: 'Section 2 (Poetry)', keyTopics: 'Arunachal Pradesh, Native lore, Immortality of river vs mortal life, Ecology' },

    // SECTION THREE (Writing Skills)
    { number: '3.1', title: 'Summary Writing', section: 'Section 3 (Writing Skills)', keyTopics: 'Condensing texts, Identifying main ideas, Brevity, Eliminating repetition & examples' },
    { number: '3.2', title: 'Do Schools Really Kill Creativity? (Mind-Mapping)', section: 'Section 3 (Writing Skills)', keyTopics: 'Mind-mapping techniques, Visual brain notes, Central concept & branches' },
    { number: '3.3', title: 'Note–Making', section: 'Section 3 (Writing Skills)', keyTopics: 'Tabular & Tree diagram formats, Headings, Sub-points, Abbreviations' },
    { number: '3.4', title: 'Statement of Purpose (SOP)', section: 'Section 3 (Writing Skills)', keyTopics: 'University & job applications, Personal motivation, Academic background, Future aspirations' },
    { number: '3.5', title: 'Drafting a Virtual Message', section: 'Section 3 (Writing Skills)', keyTopics: 'Converting telephone conversations to written notes, Date/Time/Sender/Receiver format' },
    { number: '3.6', title: 'Group Discussion', section: 'Section 3 (Writing Skills)', keyTopics: 'Verbal communication, Listening, Moderating, Expressing opinions diplomatically' },

    // SECTION FOUR (Genre-Novel)
    { number: '4.1', title: 'History of Novel', section: 'Section 4 (Genre-Novel)', keyTopics: 'Evolution of novel, 6 Elements (Plot, Character, Theme, Setting, Conflict, Language/Style)' },
    { number: '4.2', title: 'To Sir, with Love — E. R. Braithwaite', section: 'Section 4 (Genre-Novel)', keyTopics: 'Teacher-student relationship, Greenslade School, Racial prejudice, Student Council report' },
    { number: '4.3', title: 'Around the World in Eighty Days — Jules Gabriel Verne', section: 'Section 4 (Genre-Novel)', keyTopics: 'Phileas Fogg, Passepartout, Detective Fix, Time zones, Reform Club bet' },
    { number: '4.4', title: 'The Sign of Four — Sir Arthur Ignatius Conan Doyle', section: 'Section 4 (Genre-Novel)', keyTopics: 'Sherlock Holmes, Dr. Watson, Mary Morstan, Agra treasure, Jonathan Small' },
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
  hindi: [
    { number: 'Chapter 1', title: 'नवनिर्माण (त्रिलोचन) - कविता', keyTopics: 'चतुष्पदियाँ, संघर्ष व आशावाद, जीवन मूल्य' },
    { number: 'Chapter 2', title: 'निराले भाई (महादेवी वर्मा) - संस्मरण', keyTopics: 'सूर्यकांत त्रिपाठी निराला जी का व्यक्तित्व, उदारता, साहित्य सेवा' },
    { number: 'Chapter 3', title: 'सच हम नहीं सच तुम नहीं (डॉ. जगदीश गुप्त)', keyTopics: 'नई कविता, संघर्ष ही जीवन है, सत्य का स्वरूप' },
    { number: 'Chapter 4', title: 'आदर्श बदला (सुदर्शन) - कहानी', keyTopics: 'बैजू बावरा, तानसेन, संगीत साधना, प्रतिशोध से क्षमा' },
    { number: 'Chapter 5', title: 'गुरुबानी (गुरु नानक) - पद', keyTopics: 'ईश्वर भक्ति, गुरु महत्ता, मानवता, सत्कर्म' },
    { number: 'Chapter 6', title: 'पाप के चार हथियार (कन्हैयालाल मिश्र ‘प्रभाकर’)', keyTopics: 'निबंध, समाज सुधारक, उपेक्षा, निंदा, हत्या, जय-जयकार' },
    { number: 'Chapter 7', title: 'पेड़ का दर्द (सर्वेश्वर दयाल सक्सेना)', keyTopics: 'पर्यावरण संचेतना, आधुनिकता और प्रकृति विनाश' },
    { number: 'Chapter 8', title: 'सुनो किशुनी (आशापूर्णा देवी)', keyTopics: 'नारी सशक्तिकरण, सामाजिक कुरीतियाँ, आत्मसम्मान' },
    { number: 'Chapter 9', title: 'चुनिंदा शेर (कैलाश सेंगर)', keyTopics: 'ग़ज़ल विधा, समकालीन यथार्थ, मानवीय संवेदनाएँ' },
    { number: 'Chapter 10', title: 'ओज (रामधारी सिंह ‘दिनकर’)', keyTopics: 'वीर रस, राष्ट्र प्रेम, प्रेरणादायी विचार' },
    { number: 'Chapter 11', title: 'कनुप्रिया (धर्मवीर भारती) - विशेष अध्ययन', keyTopics: 'सेतुबंध, अमंगल छाया, एक प्रश्न, राधा-कृष्ण दर्शन' },
    { number: 'Chapter 12', title: 'व्यावहारिक हिंदी व व्याकरण', keyTopics: 'पल्लवन, फीचर लेखन, ब्लॉग लेखन, प्रकाशक के नाम पत्र, रस, अलंकार, मुहावरे' },
  ],
  marathi: [
    { number: 'Chapter 1', title: 'वेगवशता (प्रा. शिवाजीराव भोसले)', keyTopics: 'वैचारिक निबंध, आधुनिक गती आणि विकृती, संयमी जीवन' },
    { number: 'Chapter 2', title: 'रोज मातीत (कल्पना दुधाळ) - कविता', keyTopics: 'शेतकरी कष्ट, श्रमप्रतिष्ठा, शेतातील जिव्हाळा' },
    { number: 'Chapter 3', title: 'आयुष्य... आनंदाचा उत्सव (व. पु. काळे)', keyTopics: 'ललित गद्य, जीवन जगण्याची कला, सकारात्मक दृष्टिकोन' },
    { number: 'Chapter 4', title: 'रंग माझा वेगळा (सुरेश भट) - गझल', keyTopics: 'कलंदर वृत्ती, सामाजिक बांधिलकी, मानवी दुःख' },
    { number: 'Chapter 5', title: 'वीरांना सलामी (अनुराधा प्रभूदेसाई)', keyTopics: 'सैनिकांचे जीवन, कारगिल अनुभव, देशभक्ती' },
    { number: 'Chapter 6', title: 'रंग आकाशाचे (कविता)', keyTopics: 'निसर्ग सौंदर्य, मानवी भावभावना' },
    { number: 'Chapter 7', title: 'कथा साहित्यप्रकार (शोध - व. पु. काळे, गढी)', keyTopics: 'कथेचे घटक, व्यक्तिचित्रण, संघर्ष व संवाद' },
    { number: 'Chapter 8', title: 'उपयोजित मराठी व व्याकरण', keyTopics: 'मुलाखत, माहितीपत्रक, अहवाल, वृत्तलेख, वाक्यप्रकार, समास, प्रयोग' },
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
  hindi: [
    { number: 'Chapter 1', title: 'प्रेरणा (त्रिपुरारि)', keyTopics: 'त्रिवेणी विधा, जीवन दर्शन, प्रेरणा' },
    { number: 'Chapter 2', title: 'लघुकथाएँ (संतोष श्रीवास्तव)', keyTopics: 'उषा की दीपावली, मुस्कुराहट, मानवीय संवेदना' },
    { number: 'Chapter 3', title: 'पंद्रह अगस्त (गिरिजाकुमार माथुर)', keyTopics: 'देशभक्ति, स्वतंत्रता के मायने, सतर्कता' },
    { number: 'Chapter 4', title: 'परिश्रम ही जीवन है', keyTopics: 'कर्मनिष्ठा, सफलता का मूलमंत्र' },
    { number: 'Chapter 5', title: 'व्याकरण व व्यावहारिक हिंदी', keyTopics: 'पत्रलेखन, निबंध, मुहावरे, शब्द संपदा' },
  ],
  marathi: [
    { number: 'Chapter 1', title: 'मामू (शिवाजी सावंत)', keyTopics: 'व्यक्तिचित्रण, प्रामाणिकपणा, सेवाभाव' },
    { number: 'Chapter 2', title: 'प्राणसई (इंदिरा संत)', keyTopics: 'भावकविता, विरह, मैत्री' },
    { number: 'Chapter 3', title: 'ऐशी अक्षरे रसिके', keyTopics: 'मराठी भाषेचे वैभव, ज्ञानेश्वरी संदर्भासह' },
    { number: 'Chapter 4', title: 'व्याकरण व उपयोजित मराठी', keyTopics: 'शब्दसंपत्ती, निबंध, पत्रव्यवहार' },
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

    // Direct explicit chapter assignment check (Highest Priority)
    if (d.chapterNumber && d.chapterNumber !== 'All' && d.chapterNumber !== 'General') {
      if (
        d.chapterNumber === ch.number ||
        d.chapterNumber.toLowerCase() === ch.number.toLowerCase() ||
        (ch.part && d.chapterNumber.includes(ch.number)) ||
        (d.chapterTitle && d.chapterTitle.trim().toLowerCase() === ch.title.trim().toLowerCase())
      ) {
        return true;
      }
      // If a document was explicitly tagged with another specific chapter, do NOT attach it here
      return false;
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

    // Decimal chapter matching for English e.g. "1.1", "2.3", "4.2"
    if (ch.number.includes('.')) {
      const escaped = ch.number.replace('.', '\\.');
      const decRegex = new RegExp(`(?:lesson|unit|prose|poem|chapter|ch)?\\s*${escaped}(?:[^0-9.]|$)`, 'i');
      if (decRegex.test(dName)) return true;
    } else if (numDigits) {
      const chRegex = new RegExp(`(?:chapter|chpt|chp|ch|unit)\\s*[-_.]?\\s*0?${numDigits}(?:[^0-9.]|$)`, 'i');
      if (chRegex.test(dName)) return true;

      // Leading number e.g. "1- B.K Chapter 1..." or "01 - ..."
      const leadRegex = new RegExp(`^0?${numDigits}\\s*[-_.]`, 'i');
      if (leadRegex.test(dName)) return true;
    }

    // 2. Direct topic keyword matching
    const titleLower = ch.title.toLowerCase();
    if (titleLower.includes('astrologer') && dName.includes('astrologer')) return true;
    if (titleLower.includes('cop and the anthem') && (dName.includes('cop') || dName.includes('anthem'))) return true;
    if (titleLower.includes('big data') && dName.includes('big data')) return true;
    if (titleLower.includes('new dress') && dName.includes('new dress')) return true;
    if (titleLower.includes('into the wild') && dName.includes('wild')) return true;
    if (titleLower.includes('why we travel') && dName.includes('travel')) return true;
    if (titleLower.includes('voyaging') && dName.includes('voyaging')) return true;
    if (titleLower.includes('open road') && dName.includes('open road')) return true;
    if (titleLower.includes('indian weavers') && dName.includes('weaver')) return true;
    if (titleLower.includes('inchcape rock') && dName.includes('inchcape')) return true;
    if (titleLower.includes('earned your tomorrow') && dName.includes('tomorrow')) return true;
    if (titleLower.includes('father returning') && dName.includes('father')) return true;
    if (titleLower.includes('she walks in beauty') && (dName.includes('walks in beauty') || dName.includes('beauty'))) return true;
    if (titleLower.includes('small towns') && dName.includes('small town')) return true;
    if (titleLower.includes('mind-mapping') && (dName.includes('mind mapping') || dName.includes('mind-mapping'))) return true;
    if (titleLower.includes('note–making') && (dName.includes('note making') || dName.includes('note-making'))) return true;
    if (titleLower.includes('statement of purpose') && (dName.includes('sop') || dName.includes('statement of purpose'))) return true;
    if (titleLower.includes('virtual message') && dName.includes('virtual message')) return true;
    if (titleLower.includes('group discussion') && dName.includes('group discussion')) return true;
    if (titleLower.includes('to sir, with love') && (dName.includes('sir, with love') || dName.includes('sir with love') || dName.includes('braithwaite'))) return true;
    if (titleLower.includes('eighty days') && (dName.includes('eighty days') || dName.includes('80 days') || dName.includes('phileas fogg'))) return true;
    if (titleLower.includes('sign of four') && (dName.includes('sign of four') || dName.includes('sign of 4') || dName.includes('sherlock'))) return true;

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
};

// Automatically detects matching syllabus chapter from uploaded file name
const detectChapterForFile = (
  fileName: string,
  chapters: ChapterItem[],
  fallbackChapter: string = 'All'
): { chapterNumber: string; customChapter: string } => {
  if (fallbackChapter && fallbackChapter !== 'All' && fallbackChapter !== 'custom') {
    return { chapterNumber: fallbackChapter, customChapter: '' };
  }
  const clean = fileName.toLowerCase();
  for (const ch of chapters) {
    const digits = ch.number.match(/\d+/g);
    if (digits && digits.length > 0) {
      const d = digits[digits.length - 1];
      const patterns = [
        new RegExp(`(?:ch|chapter|unit|lesson|part)[_\\s.-]*0*${d}(?!\\d)`, 'i'),
        new RegExp(`\\b${d}[_\\s.-]+(?:ch|chapter)`, 'i'),
        new RegExp(`^0*${d}[_\\s.-]`, 'i'),
      ];
      if (patterns.some((rg) => rg.test(clean))) {
        return { chapterNumber: ch.number, customChapter: '' };
      }
    }
    const titleWords = ch.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 4 && !['basic', 'introduction', 'forms', 'business'].includes(w));
    if (titleWords.some((w: string) => clean.includes(w))) {
      return { chapterNumber: ch.number, customChapter: '' };
    }
  }
  return { chapterNumber: fallbackChapter || 'All', customChapter: '' };
};

export const SubjectRooms: React.FC = () => {
  const { currentUser, isSuperAdmin, canUpload, activeStandard } = useAuth();

  // Navigation & Room State
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'syllabus' | 'textbooks' | 'notes' | 'pyq'>('syllabus');
  const [readingDoc, setReadingDoc] = useState<ServerDocument | null>(null);

  // Chapter syllabus mastery tracking (strictly isolated per student account)
  const [completedChapters, setCompletedChapters] = useState<Record<string, boolean>>(() => {
    return getUserStorageItem<Record<string, boolean>>('aether_chapter_progress', {});
  });

  // Reload user-scoped chapter progress when student logs in or switches
  useEffect(() => {
    setCompletedChapters(getUserStorageItem<Record<string, boolean>>('aether_chapter_progress', {}));
  }, [currentUser?.email]);

  // Document & Subject & PYQ Data - Hydrate immediately from local storage so screen never stalls
  const [documents, setDocuments] = useState<ServerDocument[]>(() => api.getLocalDocuments());
  const [testPapers, setTestPapers] = useState<TestPaper[]>(() => {
    try {
      const cached = localStorage.getItem('aether_cached_test_papers');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [serverSubjects, setServerSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
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

  // Dedicated Upload Studio Page & Bulk Uploader States
  const [isUploadPage, setIsUploadPage] = useState<boolean>(false);
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [uploadSubject, setUploadSubject] = useState<string>('');
  const [uploadChapterTitle, setUploadChapterTitle] = useState<string>('');
  const [uploadCategory, setUploadCategory] = useState<'textbook' | 'notes'>('notes');
  const [uploadStandard, setUploadStandard] = useState<string>('12');
  const [uploadChapterNumber, setUploadChapterNumber] = useState<string>('All');
  const [uploadCustomChapter, setUploadCustomChapter] = useState<string>('');
  const [uploadCustomFilter, setUploadCustomFilter] = useState<string>('Theory Notes');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileConfigs, setFileConfigs] = useState<Array<{
    id: string;
    file: File;
    chapterNumber: string;
    customChapter: string;
    category: 'textbook' | 'notes';
    customFilter: string;
  }>>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Notes Tab View & Custom Filters
  const [notesViewMode, setNotesViewMode] = useState<'chapter' | 'grid'>('chapter');
  const [selectedCustomFilter, setSelectedCustomFilter] = useState<string>('All');
  const [noteSearchQuery, setNoteSearchQuery] = useState<string>('');
  const [customFiltersList, setCustomFiltersList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('aether_custom_filters');
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['Theory Notes', 'Question Bank', 'Formula Sheet', 'Summary & Revision', 'Solved Examples'];
  });
  const [isPurgingNotes, setIsPurgingNotes] = useState<boolean>(false);

  // Rich Tag Creation & PDF/Chapter Assignment Modal State
  const [showTagAssignModal, setShowTagAssignModal] = useState<boolean>(false);
  const [assignTagName, setAssignTagName] = useState<string>('');
  const [assignSelectedChapters, setAssignSelectedChapters] = useState<string[]>([]);
  const [assignSelectedDocIds, setAssignSelectedDocIds] = useState<string[]>([]);
  const [assignSearchFilter, setAssignSearchFilter] = useState<string>('');

  // Quick Single Document Tag/Chapter Editor State
  const [editingDoc, setEditingDoc] = useState<ServerDocument | null>(null);
  const [editDocChapter, setEditDocChapter] = useState<string>('');
  const [editDocTag, setEditDocTag] = useState<string>('');

  // Section collapse/visibility toggles for empty chapters (keeps chapters with files UP at top)
  const [showEmptyChaptersSyllabus, setShowEmptyChaptersSyllabus] = useState<boolean>(true);
  const [showEmptyChaptersNotes, setShowEmptyChaptersNotes] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch documents and subjects (non-blocking stale-while-revalidate with failsafe safety timer)
  const loadContent = async () => {
    const safetyTimer = setTimeout(() => setIsLoading(false), 1200);
    try {
      const [docsRes, subjsRes, papersRes] = await Promise.allSettled([
        api.getDocuments(),
        api.getSubjects(),
        api.getTestPapers(),
      ]);
      if (docsRes.status === 'fulfilled' && Array.isArray(docsRes.value) && docsRes.value.length > 0) {
        setDocuments(docsRes.value);
      }
      if (subjsRes.status === 'fulfilled' && Array.isArray(subjsRes.value) && subjsRes.value.length > 0) {
        setServerSubjects(subjsRes.value);
      }
      if (papersRes.status === 'fulfilled' && Array.isArray(papersRes.value) && papersRes.value.length > 0) {
        setTestPapers(papersRes.value);
      }
    } catch (err) {
      console.warn('Could not load subjects and documents:', err);
    } finally {
      clearTimeout(safetyTimer);
      setIsLoading(false);
    }
  };

  // One-time automatic clean-slate migration to flush old Google Drive cache
  useEffect(() => {
    const CLEAN_SLATE_KEY = 'aether_db_clean_slate_2026_v1';
    if (typeof window !== 'undefined' && localStorage.getItem(CLEAN_SLATE_KEY) !== 'done') {
      localStorage.setItem(CLEAN_SLATE_KEY, 'done');
      localStorage.removeItem('aether_cached_documents');
      localStorage.removeItem('aether_deleted_document_ids');
      localStorage.removeItem('aether_documents');
      localStorage.removeItem('aether_local_documents');
      localStorage.removeItem('aether_user_documents');
      api.saveLocalDocuments([]);
      setDocuments([]);
      firebaseDocuments.resetFull().catch(() => {});
      fetch('/api/documents-all/reset-full', { method: 'POST' }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [activeStandard, isSuperAdmin]);

  // Real-time Cloud Synchronization for academic documents across tabs and devices
  useEffect(() => {
    const unsubscribe = firebaseDocuments.subscribe((cloudDocs) => {
      if (Array.isArray(cloudDocs)) {
        const deletedIds = firebaseDeletedDocs.getDeletedIds();
        setDocuments((prev) => {
          const docMap = new Map<string, ServerDocument>();
          // Cloud documents take precedence (strictly filtering out deleted documents)
          cloudDocs.forEach((d) => {
            if (d && d.id && !deletedIds.has(d.id) && !firebaseDeletedDocs.isDeleted(d)) {
              docMap.set(d.id, d);
            }
          });
          // Preserve local documents not yet in cloud (strictly filtering out deleted documents)
          prev.forEach((d) => {
            if (d && d.id && !docMap.has(d.id) && !deletedIds.has(d.id) && !firebaseDeletedDocs.isDeleted(d)) {
              docMap.set(d.id, d);
            }
          });
          const merged = Array.from(docMap.values());
          api.saveLocalDocuments(merged);
          return merged;
        });
      }
    });
    return () => unsubscribe();
  }, []);

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

  // Dedicated 100% to Maharashtra State Board Standard 12 (HSC Commerce)
  const effectiveStandard = '12';

  // Open the dedicated full-view Document Upload Studio
  const openUploadStudio = (options?: {
    subject?: string;
    category?: 'textbook' | 'notes';
    chapterNumber?: string;
    chapterTitle?: string;
  }) => {
    const targetSub = options?.subject || activeRoom || availableSubjects[0]?.name || 'General';
    setUploadSubject(targetSub);
    setUploadCategory(options?.category || 'notes');
    if (options?.chapterNumber) {
      setUploadChapterNumber(options.chapterNumber);
      setUploadChapterTitle(options.chapterTitle || '');
    } else {
      setUploadChapterNumber('All');
      setUploadChapterTitle('');
    }
    setUploadStandard(effectiveStandard || (activeStandard !== 'ALL' ? activeStandard : '12'));
    setUploadError(null);
    setUploadSuccess(false);
    setIsUploadPage(true);
  };

  // Batch Staging Helper: processes new files with smart chapter detection
  const addFilesToStaging = (newFileList: File[]) => {
    if (!newFileList || newFileList.length === 0) return;
    const targetSub = uploadSubject || activeRoom || availableSubjects[0]?.name || 'General';
    const targetSlug = getSubjectSlug(targetSub);
    const targetChapters = ALL_SYLLABUS_CHAPTERS[uploadStandard]?.[targetSlug] || ALL_SYLLABUS_CHAPTERS['12']?.[targetSlug] || [];

    const newConfigs = newFileList.map((file) => {
      const detected = detectChapterForFile(file.name, targetChapters, uploadChapterNumber);
      return {
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file,
        chapterNumber: detected.chapterNumber,
        customChapter: detected.customChapter,
        category: uploadCategory,
        customFilter: uploadCustomFilter,
      };
    });

    setFileConfigs((prev) => [...prev, ...newConfigs]);
    setSelectedFiles((prev) => [...prev, ...newFileList]);
    setSelectedFile(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToStaging(Array.from(e.dataTransfer.files));
    }
  };

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

  // Pre-calculate per-subject document metrics for Desk view to eliminate render-time filtering lag
  const subjectMetricsMap = useMemo(() => {
    const metrics: Record<string, { directDocsCount: number; tBooks: number; nDocs: number; pCount: number }> = {};

    availableSubjects.forEach((sub) => {
      metrics[sub.name] = { directDocsCount: 0, tBooks: 0, nDocs: 0, pCount: 0 };
    });

    standardFilteredDocuments.forEach((doc) => {
      const docSub = doc.subject || '';
      availableSubjects.forEach((sub) => {
        if (matchSubjectDoc(sub.name, docSub)) {
          const entry = metrics[sub.name];
          if (entry) {
            entry.directDocsCount++;
            if (doc.category === 'textbook') {
              entry.tBooks++;
            } else {
              entry.nDocs++;
            }
          }
        }
      });
    });

    testPapers.forEach((paper) => {
      const pSub = paper.subject || '';
      availableSubjects.forEach((sub) => {
        if (matchSubjectDoc(sub.name, pSub)) {
          const entry = metrics[sub.name];
          if (entry) {
            entry.pCount++;
          }
        }
      });
    });

    return metrics;
  }, [availableSubjects, standardFilteredDocuments, testPapers]);

  // Desk Home Subjects List (Direct display of all subjects)
  const filteredDeskSubjects = availableSubjects;

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
  const handleSelectRoom = (subjectName: string, initialTab?: 'textbooks' | 'notes' | 'pyq') => {
    setActiveRoom(subjectName);
    setReadingDoc(null);

    if (initialTab) {
      setActiveCategoryTab(initialTab);
    } else {
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

  // Dynamically aggregated custom filters for this room
  const availableCustomFilters = useMemo(() => {
    const set = new Set<string>(customFiltersList);
    notesDocs.forEach((d) => {
      if (d.customFilter && d.customFilter.trim()) {
        set.add(d.customFilter.trim());
      }
      if (Array.isArray(d.tags)) {
        d.tags.forEach((t) => {
          if (t && t.trim()) set.add(t.trim());
        });
      }
    });
    return Array.from(set);
  }, [customFiltersList, notesDocs]);

  // Selected Chapter filter for Notes and Textbooks tabs
  const [selectedChapterFilter, setSelectedChapterFilter] = useState<string>('All');

  // Filter documents by custom tag, live search, and selected chapter
  const filteredNotesDocs = useMemo(() => {
    let list = notesDocs;

    // 1. Filter by custom filter tag
    if (selectedCustomFilter !== 'All') {
      const tagLower = selectedCustomFilter.toLowerCase();
      list = list.filter((d) => {
        if (d.customFilter && d.customFilter.toLowerCase() === tagLower) return true;
        if (d.tags && d.tags.some((t) => t.toLowerCase() === tagLower)) return true;
        const nameLower = (d.originalName || d.name || '').toLowerCase();
        return nameLower.includes(tagLower);
      });
    }

    // 2. Filter by search query
    if (noteSearchQuery.trim()) {
      const q = noteSearchQuery.trim().toLowerCase();
      list = list.filter((d) => {
        const dName = (d.originalName || d.name || '').toLowerCase();
        const ch = (d.chapterNumber || '').toLowerCase();
        const chTitle = (d.chapterTitle || '').toLowerCase();
        const filter = (d.customFilter || '').toLowerCase();
        return dName.includes(q) || ch.includes(q) || chTitle.includes(q) || filter.includes(q);
      });
    }

    // 3. Filter by selected chapter
    if (selectedChapterFilter !== 'All') {
      const targetChapter = activeRoomChapters.find((ch) => ch.number === selectedChapterFilter);
      if (targetChapter) {
        list = list.filter((d) => getDocsForChapter(targetChapter, [d], effectiveStandard).length > 0);
      }
    }

    return list;
  }, [notesDocs, selectedCustomFilter, noteSearchQuery, selectedChapterFilter, activeRoomChapters, effectiveStandard]);

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

  // Partition Syllabus chapters: Chapters WITH files go UP (top); chapters WITHOUT files go NICHE (bottom)
  const syllabusChapterBuckets = useMemo(() => {
    const withFiles: Array<{ chapter: ChapterItem; docs: ServerDocument[]; isCompleted: boolean; chapterKey: string }> = [];
    const withoutFiles: Array<{ chapter: ChapterItem; docs: ServerDocument[]; isCompleted: boolean; chapterKey: string }> = [];

    activeRoomChapters.forEach((ch) => {
      const chapterKey = `${activeSubjectSlug}-${ch.number}`;
      const isCompleted = !!completedChapters[chapterKey];
      const docs = getDocsForChapter(ch, roomDocuments, effectiveStandard);

      if (docs.length > 0) {
        withFiles.push({ chapter: ch, docs, isCompleted, chapterKey });
      } else {
        withoutFiles.push({ chapter: ch, docs, isCompleted, chapterKey });
      }
    });

    return { withFiles, withoutFiles };
  }, [activeRoomChapters, roomDocuments, effectiveStandard, completedChapters, activeSubjectSlug]);

  // Partition Notes chapters: Chapters WITH study notes go UP (top); chapters WITHOUT notes go NICHE (bottom)
  const notesChapterBuckets = useMemo(() => {
    const withNotes: Array<{ chapter: ChapterItem; allDocs: ServerDocument[]; filteredDocs: ServerDocument[] }> = [];
    const withoutNotes: Array<{ chapter: ChapterItem; allDocs: ServerDocument[]; filteredDocs: ServerDocument[] }> = [];

    activeRoomChapters.forEach((ch) => {
      const allChDocs = notesDocs.filter((d) => getDocsForChapter(ch, [d], effectiveStandard).length > 0);
      const chFilteredDocs = allChDocs.filter((d) => {
        if (selectedCustomFilter !== 'All') {
          const tagLower = selectedCustomFilter.toLowerCase();
          const matchesTag =
            (d.customFilter && d.customFilter.toLowerCase() === tagLower) ||
            (d.tags && d.tags.some((t) => t.toLowerCase() === tagLower)) ||
            (d.originalName || d.name || '').toLowerCase().includes(tagLower);
          if (!matchesTag) return false;
        }
        if (noteSearchQuery.trim()) {
          const q = noteSearchQuery.trim().toLowerCase();
          const dName = (d.originalName || d.name || '').toLowerCase();
          const filter = (d.customFilter || '').toLowerCase();
          if (!dName.includes(q) && !filter.includes(q)) return false;
        }
        return true;
      });

      if (allChDocs.length > 0) {
        withNotes.push({ chapter: ch, allDocs: allChDocs, filteredDocs: chFilteredDocs });
      } else {
        withoutNotes.push({ chapter: ch, allDocs: allChDocs, filteredDocs: [] });
      }
    });

    return { withNotes, withoutNotes };
  }, [activeRoomChapters, notesDocs, effectiveStandard, selectedCustomFilter, noteSearchQuery]);

  // Toggle chapter completion
  const toggleChapter = (chapterKey: string) => {
    setCompletedChapters((prev) => {
      const next = { ...prev, [chapterKey]: !prev[chapterKey] };
      setUserStorageItem('aether_chapter_progress', next);
      return next;
    });
  };

  const handleMarkAllChapters = () => {
    setCompletedChapters((prev) => {
      const next = { ...prev };
      activeRoomChapters.forEach((ch) => {
        next[`${activeSubjectSlug}-${ch.number}`] = true;
      });
      setUserStorageItem('aether_chapter_progress', next);
      return next;
    });
  };

  const handleResetChapters = () => {
    setCompletedChapters((prev) => {
      const next = { ...prev };
      activeRoomChapters.forEach((ch) => {
        delete next[`${activeSubjectSlug}-${ch.number}`];
      });
      setUserStorageItem('aether_chapter_progress', next);
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

  // Delete Document Handler (Synchronous Optimistic UI Removal + Permanent Tombstone)
  const handleDeleteDocument = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to remove this study document? It will also be deleted from Google Drive.')) return;

    const docToDelete = documents.find((d) => d.id === id);

    // 1. Instant Optimistic UI removal: Card disappears immediately without waiting for any network
    setDocuments((prev) =>
      prev.filter((d) => {
        if (d.id === id) return false;
        if (docToDelete) {
          if (docToDelete.name && d.name === docToDelete.name) return false;
          if (docToDelete.originalName && d.originalName === docToDelete.originalName) return false;
          if (docToDelete.streamUrl && d.streamUrl === docToDelete.streamUrl) return false;
        }
        return true;
      })
    );

    // 2. Immediately close PDF reader if this document is open
    if (readingDoc?.id === id || (docToDelete && readingDoc?.name === docToDelete.name)) {
      handleCloseReader();
    }

    // 3. Synchronously record tombstone into localStorage and memory so it never revives
    firebaseDeletedDocs.markDeletedSync(docToDelete || id);

    // 4. Synchronously purge from local cache
    try {
      const currentLocal = api.getLocalDocuments();
      api.saveLocalDocuments(
        currentLocal.filter((d) => {
          if (d.id === id) return false;
          if (docToDelete) {
            if (docToDelete.name && d.name === docToDelete.name) return false;
            if (docToDelete.originalName && d.originalName === docToDelete.originalName) return false;
            if (docToDelete.streamUrl && d.streamUrl === docToDelete.streamUrl) return false;
          }
          return true;
        })
      );
    } catch {}

    // 5. Fire background asynchronous deletion tasks (Google Drive, Firebase, Backend)
    (async () => {
      try {
        if (docToDelete) {
          deleteFromGoogleDrive(docToDelete).catch((err) => console.warn('[Drive delete notice]:', err));
        }
        await api.deleteDocument(id, currentUser?.email, docToDelete);
      } catch (err: any) {
        console.warn('[Background document deletion]:', err);
      }
    })();
  };

  // Complete Database Reset (Super Admin only - preserves PYQs)
  const handlePurgeAllNotes = async () => {
    if (!isSuperAdmin) return;
    const confirmed = window.confirm(
      '⚠️ COMPLETE DATABASE RESET:\n\n' +
      '• Completely wipes all uploaded study notes and old Google Drive records from all databases.\n' +
      '• Resets all caches and tombstones so you can reupload fresh files cleanly.\n' +
      '• ALL PYQ past board exam papers will remain 100% SAFE and untouched.\n\n' +
      'Click OK to proceed with resetting the database.'
    );
    if (!confirmed) return;

    // Instant optimistic UI purge
    setDocuments([]);
    localStorage.removeItem('aether_cached_documents');
    localStorage.removeItem('aether_deleted_document_ids');
    localStorage.removeItem('aether_documents');
    localStorage.removeItem('aether_local_documents');
    api.saveLocalDocuments([]);

    try {
      setIsPurgingNotes(true);
      await api.resetFullData();
      alert('All study notes have been wiped cleanly. Database is ready for fresh uploads.');
    } catch (err: any) {
      alert(err.message || 'Failed to purge documents.');
    } finally {
      setIsPurgingNotes(false);
    }
  };

  // Open Tag Creation & Assignment Modal
  const handleOpenCreateTagModal = (presetTag?: string) => {
    setAssignTagName(presetTag || '');
    setAssignSelectedChapters([]);
    if (selectedChapterFilter !== 'All') {
      const targetChapter = activeRoomChapters.find((c) => c.number === selectedChapterFilter);
      if (targetChapter) {
        const docIds = roomDocuments
          .filter((d) => getDocsForChapter(targetChapter, [d], effectiveStandard).length > 0)
          .map((d) => d.id);
        setAssignSelectedDocIds(docIds);
        setAssignSelectedChapters([selectedChapterFilter]);
      } else {
        setAssignSelectedDocIds([]);
      }
    } else {
      setAssignSelectedDocIds([]);
    }
    setAssignSearchFilter('');
    setShowTagAssignModal(true);
  };

  // Toggle chapter in Tag Assignment Modal (and sync its documents)
  const handleToggleAssignChapter = (chNumber: string) => {
    setAssignSelectedChapters((prev) => {
      const isAlreadySelected = prev.includes(chNumber);
      const nextChapters = isAlreadySelected
        ? prev.filter((c) => c !== chNumber)
        : [...prev, chNumber];

      const targetChapter = activeRoomChapters.find((c) => c.number === chNumber);
      if (targetChapter) {
        const chapterDocIds = roomDocuments
          .filter((d) => getDocsForChapter(targetChapter, [d], effectiveStandard).length > 0)
          .map((d) => d.id);

        setAssignSelectedDocIds((prevDocIds) => {
          if (isAlreadySelected) {
            return prevDocIds.filter((id) => !chapterDocIds.includes(id));
          } else {
            return Array.from(new Set([...prevDocIds, ...chapterDocIds]));
          }
        });
      }

      return nextChapters;
    });
  };

  // Toggle individual PDF document in Tag Assignment Modal
  const handleToggleAssignDoc = (docId: string) => {
    setAssignSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  // Select all / Deselect all documents in Tag Assignment Modal
  const handleToggleSelectAllDocs = () => {
    if (assignSelectedDocIds.length === roomDocuments.length && roomDocuments.length > 0) {
      setAssignSelectedDocIds([]);
      setAssignSelectedChapters([]);
    } else {
      setAssignSelectedDocIds(roomDocuments.map((d) => d.id));
      setAssignSelectedChapters(activeRoomChapters.map((c) => c.number));
    }
  };

  // Save Tag & Document Assignment
  const handleSaveTagAssignment = async () => {
    const trimmedTag = assignTagName.trim();
    if (!trimmedTag) return;

    // 1. Add to custom filters list if not present
    if (!customFiltersList.includes(trimmedTag)) {
      const updatedList = [...customFiltersList, trimmedTag];
      setCustomFiltersList(updatedList);
      localStorage.setItem('aether_custom_filters', JSON.stringify(updatedList));
    }

    // 2. Batch update documents if any are selected
    if (assignSelectedDocIds.length > 0) {
      const updates = assignSelectedDocIds.map((id) => {
        const existingDoc = documents.find((d) => d.id === id);
        const existingTags = existingDoc?.tags || [];
        const nextTags = existingTags.includes(trimmedTag) ? existingTags : [...existingTags, trimmedTag];
        return {
          id,
          changes: {
            customFilter: trimmedTag,
            tags: nextTags,
          },
        };
      });

      const updatedDocs = await api.batchUpdateDocuments(updates);
      if (updatedDocs.length > 0) {
        setDocuments((prev) => {
          const map = new Map(updatedDocs.map((u) => [u.id, u]));
          return prev.map((d) => map.get(d.id) || d);
        });
      }
    }

    // 3. Select this tag so the user immediately sees the documents under it
    setSelectedCustomFilter(trimmedTag);
    setActiveCategoryTab('notes');
    setShowTagAssignModal(false);
  };

  // Save Single Document Edit (Chapter & Tag)
  const handleSaveSingleDocEdit = async () => {
    if (!editingDoc) return;
    const trimmedTag = editDocTag.trim();
    const existingTags = editingDoc.tags || [];
    const nextTags = trimmedTag && !existingTags.includes(trimmedTag)
      ? [...existingTags, trimmedTag]
      : existingTags;

    let chTitle = editingDoc.chapterTitle;
    if (editDocChapter && editDocChapter !== 'All') {
      const foundCh = activeRoomChapters.find((c) => c.number === editDocChapter);
      if (foundCh) chTitle = foundCh.title;
    }

    const updated = await api.updateDocument(editingDoc.id, {
      chapterNumber: editDocChapter,
      chapterTitle: chTitle,
      customFilter: trimmedTag,
      tags: nextTags,
    });

    if (updated) {
      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      if (trimmedTag && !customFiltersList.includes(trimmedTag)) {
        const nextList = [...customFiltersList, trimmedTag];
        setCustomFiltersList(nextList);
        localStorage.setItem('aether_custom_filters', JSON.stringify(nextList));
      }
    }

    setEditingDoc(null);
  };

  // Handle Upload (supports single or multiple files in batch with per-file chapter customisation)
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filesToUpload = fileConfigs.length > 0
      ? fileConfigs.map((c) => c.file)
      : (selectedFiles.length > 0 ? selectedFiles : (selectedFile ? [selectedFile] : []));

    if (filesToUpload.length === 0) {
      setUploadError('Please select at least one study document or PDF.');
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
      const finalChapterNumber = uploadChapterNumber === 'custom' 
        ? uploadCustomChapter.trim() 
        : (uploadChapterNumber !== 'All' ? uploadChapterNumber : '');
      const matchedChapterItem = activeRoomChapters.find((c) => c.number === finalChapterNumber);
      const finalChapterTitle = uploadChapterTitle || matchedChapterItem?.title || (uploadChapterNumber === 'custom' ? uploadCustomChapter.trim() : '');
      const finalFilter = uploadCustomFilter.trim();

      // If user typed a new custom filter, persist it
      if (finalFilter && !customFiltersList.includes(finalFilter)) {
        const updated = [...customFiltersList, finalFilter];
        setCustomFiltersList(updated);
        try {
          localStorage.setItem('aether_custom_filters', JSON.stringify(updated));
        } catch {}
      }

      // Prepare custom metadata for each individual PDF
      const itemsMeta = filesToUpload.map((file, idx) => {
        const cfg = fileConfigs[idx] || fileConfigs.find((c) => c.file === file);
        const chNum = cfg
          ? (cfg.chapterNumber === 'custom' ? cfg.customChapter.trim() : (cfg.chapterNumber !== 'All' ? cfg.chapterNumber : ''))
          : finalChapterNumber;
        const matched = activeRoomChapters.find((c) => c.number === chNum);
        const chTitle = matched?.title || (cfg?.chapterNumber === 'custom' ? cfg.customChapter.trim() : finalChapterTitle);
        const cat = cfg?.category || uploadCategory;
        const filt = (cfg?.customFilter || finalFilter).trim();
        return {
          name: file.name,
          chapterNumber: chNum,
          chapterTitle: chTitle,
          category: cat,
          customFilter: filt,
          tags: filt ? [filt] : [],
        };
      });

      const newlyUploaded: ServerDocument[] = [];

      // Process each file (supports single or batch uploads with Google Drive & Firebase sync)
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        const meta = itemsMeta[i] || {};
        const chNum = meta.chapterNumber || finalChapterNumber;
        const chTitle = meta.chapterTitle || finalChapterTitle;
        const cat = meta.category || uploadCategory;
        const filt = meta.customFilter || finalFilter;
        const tags = meta.tags || (filt ? [filt] : []);

        let uploadedRecord: ServerDocument | null = null;

        // Upload via high-speed vault & cloud sync pipeline
        try {
          uploadedRecord = await api.uploadDocument(
            file,
            targetSub,
            currentUser?.email || 'Faculty',
            targetStd,
            cat,
            chNum,
            chTitle,
            filt,
            tags
          );
        } catch (err: any) {
          console.warn(`[Vault Direct Upload Fallback for ${file.name}]:`, err);
          const docId = 'doc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
          let vaultUrl = '';
          try {
            vaultUrl = await pdfVault.store(docId, file, file.name);
          } catch {
            vaultUrl = URL.createObjectURL(file);
          }

          uploadedRecord = {
            id: docId,
            name: file.name,
            originalName: file.name,
            streamUrl: vaultUrl,
            serverUrl: vaultUrl,
            url: vaultUrl,
            mimeType: file.type || 'application/pdf',
            sizeBytes: file.size,
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            uploadedAt: new Date().toISOString(),
            uploadedBy: currentUser?.email || 'Faculty',
            subject: targetSub,
            standard: targetStd,
            category: cat,
            chapterNumber: chNum,
            chapterTitle: chTitle,
            customFilter: filt,
            tags: tags,
            uploadCount: 1,
          };

          const local = api.getLocalDocuments();
          api.saveLocalDocuments([uploadedRecord, ...local]);
        }

        if (uploadedRecord) {
          newlyUploaded.push(uploadedRecord);
          // Immediately sync individual document to Firebase cloud repository
          firebaseDocuments.saveDocument(uploadedRecord).catch(() => {});
        }
      }

      if (newlyUploaded.length === 0) {
        throw new Error('No files were successfully processed. Please try again.');
      }

      // Merge newly uploaded documents with state and persistent localStorage
      setDocuments((prev) => {
        const docMap = new Map<string, ServerDocument>();
        newlyUploaded.forEach((d) => docMap.set(d.id, d));
        prev.forEach((d) => {
          if (!docMap.has(d.id)) docMap.set(d.id, d);
        });
        const merged = Array.from(docMap.values());
        api.saveLocalDocuments(merged);
        firebaseDocuments.saveAll(merged).catch(() => {});
        return merged;
      });

      // Automatically switch to the uploaded subject room and category tab so user immediately sees their file
      if (newlyUploaded.length > 0) {
        const first = newlyUploaded[0];
        if (first.subject) {
          setActiveRoom(first.subject);
        }
        if (first.category === 'textbook') {
          setActiveCategoryTab('textbooks');
        } else {
          setActiveCategoryTab('notes');
        }
      }

      setUploadSuccess(true);
      setSelectedFiles([]);
      setSelectedFile(null);
      setFileConfigs([]);
      setUploadChapterTitle('');
      setUploadCustomChapter('');
      setTimeout(() => {
        setUploadSuccess(false);
        setIsUploadPage(false);
      }, 1200);
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
        <div className="fixed inset-0 z-50 flex flex-col h-screen w-screen overflow-hidden animate-fade-in bg-slate-950">
          <UniversalPdfViewer
            url={readingDoc.streamUrl || readingDoc.serverUrl || ''}
            title={readingDoc.name || readingDoc.originalName}
            subtitle={`${readingDoc.subject} • Class ${toRomanStandard(readingDoc.standard || activeStandard)}`}
            onClose={handleCloseReader}
            backLabel={`Back to ${readingDoc.subject}`}
            className="w-full h-full"
          />
        </div>
      ) : isUploadPage ? (
        /* ========================================================
            VIEW 2: DEDICATED FULL-VIEW ACADEMIC UPLOAD STUDIO PAGE
        ======================================================== */
        (() => {
          const studioSubject = uploadSubject || activeRoom || availableSubjects[0]?.name || 'General';
          const studioSubSlug = getSubjectSlug(studioSubject);
          const studioChapters = ALL_SYLLABUS_CHAPTERS[uploadStandard]?.[studioSubSlug] || ALL_SYLLABUS_CHAPTERS['12']?.[studioSubSlug] || [];
          const filesCount = fileConfigs.length > 0 ? fileConfigs.length : (selectedFiles.length > 0 ? selectedFiles.length : (selectedFile ? 1 : 0));

          return (
            <div className="flex flex-col h-full w-full overflow-y-auto animate-fade-in p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
              {/* Studio Header Navigation Banner */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative shrink-0">
                <div className="flex items-center space-x-3.5 sm:space-x-4 min-w-0 flex-1">
                  <button
                    onClick={() => {
                      setIsUploadPage(false);
                      setUploadError(null);
                    }}
                    className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shrink-0 cursor-pointer"
                    title={`Back to ${activeRoom || 'Subject Overview'}`}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 shrink-0">
                    <Upload className="w-6 h-6" />
                  </div>

                  <div className="min-w-0 flex-1 py-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-normal">
                        Academic Upload Studio
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-extrabold text-xs border border-brand-500/20">
                        Class {toRomanStandard(uploadStandard)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs">
                        {studioSubject}
                      </span>
                      {filesCount > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs border border-emerald-500/20">
                          {filesCount} {filesCount === 1 ? 'PDF' : 'PDFs'} Staged
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      Upload single or multiple PDFs — customize which chapter each PDF belongs to with instant Google Drive sync.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowBulkModal(true)}
                    className="px-3.5 py-2 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Bulk upload and auto-segregate complete folders"
                  >
                    <FolderUp className="w-4 h-4" />
                    <span>Bulk Folder Ingest</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadPage(false);
                      setUploadError(null);
                    }}
                    className="px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Close Studio
                  </button>
                </div>
              </div>

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                    <span>{uploadError}</span>
                  </div>
                  <button
                    onClick={() => setUploadError(null)}
                    className="text-rose-400 hover:text-rose-600 font-bold px-2 py-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Upload Success Banner */}
              {uploadSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-xs animate-fade-in">
                  <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500" />
                  <span className="font-bold">
                    Upload completed successfully! All documents are synced to Cloud & Google Drive.
                  </span>
                </div>
              )}

              {/* Studio Main Workspace Grid */}
              <form onSubmit={handleUploadSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Column 1: Left Destination & Settings (5 cols) */}
                <div className="lg:col-span-5 space-y-5">
                  {/* Target Room & Academic Level Card */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <Layers className="w-4 h-4 text-brand-500" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Destination & Academic Level
                      </h3>
                    </div>

                    <div className="space-y-3.5">
                      {/* Academic Standard */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Academic Standard
                        </label>
                        <div className="w-full bg-brand-500/10 dark:bg-brand-400/15 rounded-xl px-3.5 py-2.5 text-xs font-bold border border-brand-500/20 dark:border-brand-400/25 text-brand-700 dark:text-brand-300 flex items-center space-x-2">
                          <GraduationCap className="w-4 h-4" />
                          <span>Standard 12 (HSC Commerce Board)</span>
                        </div>
                      </div>

                      {/* Subject Room */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Subject Room
                        </label>
                        <select
                          value={uploadSubject || (activeRoom || availableSubjects[0]?.name || 'General')}
                          onChange={(e) => setUploadSubject(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          {availableSubjects.map((sub) => (
                            <option key={sub.name} value={sub.name}>
                              {sub.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Document Type Category */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Material Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setUploadCategory('notes')}
                            className={`py-2.5 px-3 rounded-xl border text-left font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              uploadCategory === 'notes'
                                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <FileText className="w-4 h-4 shrink-0" />
                            <span className="text-xs">📝 Study Notes</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setUploadCategory('textbook')}
                            className={`py-2.5 px-3 rounded-xl border text-left font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              uploadCategory === 'textbook'
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <BookOpen className="w-4 h-4 shrink-0" />
                            <span className="text-xs">📚 Textbook PDF</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Default Chapter & Filter Customization Card */}
                  <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Default Chapter & Tag
                      </h3>
                    </div>

                    <div className="space-y-3.5">
                      {/* Default Chapter */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Default Chapter
                          </label>
                          {fileConfigs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setFileConfigs((prev) =>
                                  prev.map((item) => ({
                                    ...item,
                                    chapterNumber: uploadChapterNumber,
                                    customChapter: uploadCustomChapter,
                                  }))
                                );
                              }}
                              className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer flex items-center gap-1"
                              title="Apply this chapter to all staged files"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Apply to all {fileConfigs.length} files</span>
                            </button>
                          )}
                        </div>

                        <select
                          value={uploadChapterNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            setUploadChapterNumber(val);
                            if (val !== 'custom') {
                              setUploadCustomChapter('');
                              const found = studioChapters.find((ch) => ch.number === val);
                              setUploadChapterTitle(found?.title || '');
                            }
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                        >
                          <option value="All">General / All Chapters (Full Syllabus)</option>
                          {studioChapters.map((ch) => (
                            <option key={ch.number} value={ch.number}>
                              {ch.number}: {ch.title}
                            </option>
                          ))}
                          <option value="custom">✏️ Enter Custom Chapter Name...</option>
                        </select>

                        {uploadChapterNumber === 'custom' && (
                          <input
                            type="text"
                            value={uploadCustomChapter}
                            onChange={(e) => setUploadCustomChapter(e.target.value)}
                            placeholder="e.g. Chapter 7: Advanced Revision"
                            className="mt-2 w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                            autoFocus
                          />
                        )}
                      </div>

                      {/* Custom Filter / Tag */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Custom Filter Tag
                        </label>
                        {/* Quick Tag Pills */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {availableCustomFilters.slice(0, 6).map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setUploadCustomFilter(tag)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                uploadCustomFilter === tag
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>

                        <input
                          type="text"
                          value={uploadCustomFilter}
                          onChange={(e) => setUploadCustomFilter(e.target.value)}
                          placeholder="e.g. Theory Notes, Question Bank, Formula Sheet"
                          className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interactive Drag & Drop Box */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center relative ${
                      isDragOver
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/30 scale-[1.01]'
                        : 'border-slate-300 dark:border-slate-700 hover:border-brand-500 bg-slate-50 dark:bg-slate-900/60 hover:bg-brand-50/20 dark:hover:bg-brand-950/20'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.rtf,.epub,.html,.htm,.png,.jpg,.jpeg,.webp,.svg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          addFilesToStaging(Array.from(e.target.files));
                        }
                      }}
                    />
                    <div className="flex flex-col items-center justify-center space-y-2 py-2">
                      <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="font-bold text-sm text-slate-800 dark:text-slate-100">
                          Drop PDFs here, or click to browse
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Select single or multiple files at once. All PDFs will be staged for individual chapter tagging.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1 text-[11px] font-bold text-brand-600 dark:text-brand-400">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Browse from Computer</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Right Staging Queue & Per-File Customizer (7 cols) */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                    {/* Queue Header */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-brand-500" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Staged Files for Ingestion
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 font-extrabold border border-brand-500/20">
                          {filesCount} {filesCount === 1 ? 'file' : 'files'}
                        </span>
                      </div>

                      {fileConfigs.length > 0 && (
                        <div className="flex items-center gap-3">
                          {fileConfigs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setFileConfigs((prev) =>
                                  prev.map((c) => ({
                                    ...c,
                                    chapterNumber: uploadChapterNumber,
                                    customChapter: uploadCustomChapter,
                                    category: uploadCategory,
                                    customFilter: uploadCustomFilter,
                                  }))
                                );
                              }}
                              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                              title="Set all selected PDFs to the default chapter"
                            >
                              Sync all
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFiles([]);
                              setFileConfigs([]);
                              setSelectedFile(null);
                            }}
                            className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                          >
                            Clear queue
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Empty State */}
                    {fileConfigs.length === 0 && (
                      <div className="py-12 px-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                          <FolderUp className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                            No files staged yet
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                            Drag and drop your PDF study materials into the dropzone on the left or click browse to start staging.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Select PDF Files</span>
                        </button>
                      </div>
                    )}

                    {/* Staged Cards List */}
                    {fileConfigs.length > 0 && (
                      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                        {fileConfigs.map((item, idx) => (
                          <div
                            key={item.id}
                            className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 hover:border-brand-500/40 transition-all space-y-2.5 shadow-xs"
                          >
                            {/* File title & remove row */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-2.5 truncate min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <span className="truncate font-bold text-xs text-slate-800 dark:text-slate-100" title={item.file.name}>
                                  {item.file.name}
                                </span>
                                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                  ({(item.file.size / (1024 * 1024)).toFixed(2)} MB)
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFileConfigs((prev) => prev.filter((_, i) => i !== idx));
                                  setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors shrink-0 cursor-pointer"
                                title="Remove this PDF from batch"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Individual chapter selection for this PDF */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                                  <span>Assigned Chapter:</span>
                                  {item.chapterNumber !== 'All' && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold">
                                      Customized
                                    </span>
                                  )}
                                </label>
                                <select
                                  value={item.chapterNumber}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setFileConfigs((prev) =>
                                      prev.map((c, i) => (i === idx ? { ...c, chapterNumber: val } : c))
                                    );
                                  }}
                                  className="w-full bg-white dark:bg-slate-900 rounded-xl px-2.5 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                                >
                                  <option value="All">General / All Chapters</option>
                                  {studioChapters.map((ch) => (
                                    <option key={ch.number} value={ch.number}>
                                      {ch.number}: {ch.title}
                                    </option>
                                  ))}
                                  <option value="custom">✏️ Enter Custom Chapter...</option>
                                </select>
                                {item.chapterNumber === 'custom' && (
                                  <input
                                    type="text"
                                    value={item.customChapter}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFileConfigs((prev) =>
                                        prev.map((c, i) => (i === idx ? { ...c, customChapter: val } : c))
                                      );
                                    }}
                                    placeholder="Type custom chapter name..."
                                    className="mt-1.5 w-full bg-white dark:bg-slate-900 rounded-xl px-2.5 py-1 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                                  />
                                )}
                              </div>

                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                                  Section & Tag:
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={item.category}
                                    onChange={(e) => {
                                      const val = e.target.value as 'textbook' | 'notes';
                                      setFileConfigs((prev) =>
                                        prev.map((c, i) => (i === idx ? { ...c, category: val } : c))
                                      );
                                    }}
                                    className="bg-white dark:bg-slate-900 rounded-xl px-2 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer shrink-0"
                                  >
                                    <option value="notes">Notes</option>
                                    <option value="textbook">Textbook</option>
                                  </select>

                                  <input
                                    type="text"
                                    value={item.customFilter}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setFileConfigs((prev) =>
                                        prev.map((c, i) => (i === idx ? { ...c, customFilter: val } : c))
                                      );
                                    }}
                                    placeholder="Tag (e.g. Theory)"
                                    className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-xl px-2.5 py-1.5 text-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bottom Action / Submit Bar */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          Target: <strong className="text-slate-800 dark:text-slate-200">{studioSubject}</strong> (Class {toRomanStandard(uploadStandard)})
                        </span>
                        <span>
                          {filesCount > 0 ? `${filesCount} PDF(s) configured` : 'No files selected'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsUploadPage(false);
                            setUploadError(null);
                          }}
                          className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={isUploading || filesCount === 0}
                          className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-md shadow-brand-500/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
                        >
                          {isUploading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Uploading & Syncing to Cloud...</span>
                            </>
                          ) : uploadSuccess ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-emerald-300" />
                              <span>Upload Completed Successfully!</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span>
                                Upload {filesCount > 0 ? `${filesCount} ${filesCount === 1 ? 'PDF' : 'PDFs'}` : 'Study Material'}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          );
        })()
      ) : activeRoom ? (
        /* ========================================================
        /* ========================================================
            VIEW 3: INSIDE A SPECIFIC SUBJECT ROOM
        ======================================================== */
        <div className="flex flex-col h-full w-full overflow-y-auto animate-fade-in p-3 sm:p-5 md:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
          {/* Room Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative shrink-0">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <button
                onClick={handleBackToOverview}
                className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors shrink-0 cursor-pointer active:scale-95"
                title="Back to all subjects"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 shrink-0">
                {currentRoomMeta ? (
                  <currentRoomMeta.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </div>

              <div className="min-w-0 flex-1 py-0.5">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h2 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white leading-tight">
                    {activeRoom}
                  </h2>
                  <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-brand-500/10 dark:bg-brand-400/15 text-brand-700 dark:text-brand-300 border border-brand-500/20 dark:border-brand-400/25">
                    <GraduationCap className="w-3 h-3" />
                    <span>Class 12 HSC</span>
                  </div>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1 leading-normal">
                  {currentRoomMeta?.description || 'Dedicated Subject Room • Textbooks & Study Materials'}
                </p>
              </div>
            </div>

            {/* Quick Room Actions */}
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80">
              {canUpload && (
                <>
                  <button
                    onClick={() => openUploadStudio({ subject: activeRoom, category: 'notes' })}
                    className="flex-1 sm:flex-none justify-center px-3.5 py-2 sm:py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/25 flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowBulkModal(true);
                    }}
                    className="flex-1 sm:flex-none justify-center px-3.5 py-2 sm:py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/25 flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
                    title="Upload complete folder of study notes or test papers"
                  >
                    <FolderUp className="w-4 h-4" />
                    <span>Upload Folder</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Subject Room Sub-Navigation Tabs (Horizontal Smooth Touch-Scroll on Mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth pb-2 pt-0.5 -mx-3 px-3 sm:mx-0 sm:px-0 border-b border-slate-200 dark:border-slate-800 shrink-0">
            <button
              onClick={() => setActiveCategoryTab('syllabus')}
              className={`whitespace-nowrap shrink-0 flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                activeCategoryTab === 'syllabus'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25 ring-2 ring-brand-600/30'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden">Syllabus</span>
              <span className="hidden sm:inline">Chapter Syllabus</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  activeCategoryTab === 'syllabus'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {activeRoomChapters.length > 0 ? `${chaptersMasteredCount}/${activeRoomChapters.length}` : '0'}
              </span>
            </button>

            <button
              onClick={() => setActiveCategoryTab('textbooks')}
              className={`whitespace-nowrap shrink-0 flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                activeCategoryTab === 'textbooks'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25 ring-2 ring-brand-600/30'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden">Textbooks</span>
              <span className="hidden sm:inline">Textbook PDFs</span>
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
              className={`whitespace-nowrap shrink-0 flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                activeCategoryTab === 'notes'
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25 ring-2 ring-brand-600/30'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden">Study Notes</span>
              <span className="hidden sm:inline">Study Notes & Materials</span>
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
              className={`whitespace-nowrap shrink-0 flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                activeCategoryTab === 'pyq'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/25 ring-2 ring-purple-600/30'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="sm:hidden">Board PYQs</span>
              <span className="hidden sm:inline">Board Papers (PYQ)</span>
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
                  <div className="space-y-6">
                    {/* SECTION 1: CHAPTERS WITH STUDY MATERIALS & PDFS (UP / TOP) */}
                    {syllabusChapterBuckets.withFiles.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                              Chapters With Attached Study Materials ({syllabusChapterBuckets.withFiles.length})
                            </h4>
                          </div>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Available Now
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                          {syllabusChapterBuckets.withFiles.map(({ chapter: ch, docs: chapterDocs, isCompleted, chapterKey }) => (
                            <div
                              key={ch.number + ch.title}
                              className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                                isCompleted
                                  ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-brand-500/50 hover:shadow-md'
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
                                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer ${
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
                                      <span>Attached Study PDFs:</span>
                                    </span>
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/70 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                                      {chapterDocs.length} {chapterDocs.length === 1 ? 'PDF' : 'PDFs'}
                                    </span>
                                  </div>

                                  <div className="space-y-1.5">
                                    {chapterDocs.slice(0, 3).map((doc) => {
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
                                          <div className="flex items-center space-x-2 truncate mr-2 min-w-0">
                                            <BookOpen className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400 shrink-0" />
                                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover/doc:text-brand-600 truncate">
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
                                    {chapterDocs.length > 3 && (
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
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SECTION 2: REMAINING CHAPTERS WITHOUT MATERIALS (NICHE / BOTTOM) */}
                    {syllabusChapterBuckets.withoutFiles.length > 0 && (
                      <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                            <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                              Remaining Chapters ({syllabusChapterBuckets.withoutFiles.length} without materials)
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowEmptyChaptersSyllabus(!showEmptyChaptersSyllabus)}
                            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{showEmptyChaptersSyllabus ? 'Hide Remaining' : 'Show Remaining'}</span>
                            {showEmptyChaptersSyllabus ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {showEmptyChaptersSyllabus && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {syllabusChapterBuckets.withoutFiles.map(({ chapter: ch, isCompleted, chapterKey }) => (
                              <div
                                key={ch.number + ch.title}
                                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                  isCompleted
                                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80'
                                    : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                      {ch.number}
                                    </span>
                                    {isCompleted && (
                                      <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                        Done
                                      </span>
                                    )}
                                  </div>
                                  <h4 className={`text-xs font-bold truncate ${isCompleted ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                    {ch.title}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleChapter(chapterKey)}
                                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                      isCompleted
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-600'
                                    }`}
                                    title="Toggle mastery"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                  {canUpload && (
                                    <button
                                      type="button"
                                      onClick={() => openUploadStudio({ subject: activeRoom, chapterNumber: ch.number, chapterTitle: ch.title, category: 'notes' })}
                                      className="px-2 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                      title="Upload study note"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>Upload</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
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
                      onClick={() => openUploadStudio({ subject: activeRoom, category: 'textbook' })}
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
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
                              {canUpload && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingDoc(doc);
                                    setEditDocChapter(doc.chapterNumber || matchedCh?.number || 'All');
                                    setEditDocTag(doc.customFilter || (doc.tags && doc.tags[0]) || '');
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                                  title="Edit Chapter & Tag"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}
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
                <div className="p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-100 dark:border-amber-900">
                    <FileText className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    No Study Notes Uploaded Yet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Official HSC Board revision summaries, chapter notes, and textbook guides for {activeRoom} will appear here.
                  </p>
                  {canUpload && (
                    <div className="pt-2 flex items-center justify-center gap-2">
                      <button
                        onClick={() => openUploadStudio({ subject: activeRoom, category: 'notes' })}
                        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Upload Class {effectiveStandard} Notes</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Notes Control Bar: View Switcher, Search, and Quick Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
                    {/* View Switcher: Segmented Controller on mobile */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setNotesViewMode('chapter')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          notesViewMode === 'chapter'
                            ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>By Chapter</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotesViewMode('grid')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          notesViewMode === 'grid'
                            ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Grid className="w-3.5 h-3.5" />
                        <span>All Notes ({filteredNotesDocs.length})</span>
                      </button>
                    </div>

                    {/* Search and Action Buttons */}
                    <div className="flex items-center gap-2 w-full sm:w-auto flex-1 justify-end">
                      <div className="relative flex-1 sm:max-w-xs min-w-0">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={noteSearchQuery}
                          onChange={(e) => setNoteSearchQuery(e.target.value)}
                          placeholder="Search notes or topics..."
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs pl-8 pr-7 py-2 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        {noteSearchQuery && (
                          <button
                            onClick={() => setNoteSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={handlePurgeAllNotes}
                          disabled={isPurgingNotes}
                          className="px-2.5 sm:px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                          title="Reset entire notes database cleanly so you can reupload fresh files"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{isPurgingNotes ? 'Resetting...' : 'Reset DB'}</span>
                        </button>
                      )}

                      {canUpload && (
                        <button
                          type="button"
                          onClick={() => openUploadStudio({ subject: activeRoom, category: 'notes' })}
                          className="px-3 sm:px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Upload</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Custom Filter Pills Bar (Edge-to-Edge Touch Scroll on Mobile) */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1 shrink-0">
                      <Tag className="w-3 h-3" />
                      <span>Tag:</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedCustomFilter('All')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        selectedCustomFilter === 'All'
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      All ({notesDocs.length})
                    </button>

                    {availableCustomFilters.map((filter) => {
                      const count = notesDocs.filter((d) => {
                        const filterLower = filter.toLowerCase();
                        if (d.customFilter && d.customFilter.toLowerCase() === filterLower) return true;
                        if (d.tags && d.tags.some((t) => t.toLowerCase() === filterLower)) return true;
                        const dName = (d.originalName || d.name || '').toLowerCase();
                        return dName.includes(filterLower);
                      }).length;

                      return (
                        <button
                          key={filter}
                          type="button"
                          onClick={() => setSelectedCustomFilter(filter)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                            selectedCustomFilter === filter
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{filter}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                              selectedCustomFilter === filter
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    })}

                    {/* Create & Assign Tag Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenCreateTagModal()}
                      className="px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-brand-600 hover:from-amber-500 hover:to-brand-500 shadow-xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95"
                      title="Create a new tag and select which chapters & PDFs belong to it"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Create & Assign Tag</span>
                    </button>
                  </div>

                  {/* ========================================================
                      VIEW MODE 1: BY CHAPTER ACCORDION / NAVIGATION VIEW
                  ======================================================== */}
                  {notesViewMode === 'chapter' ? (
                    <div className="space-y-6">
                      {/* SECTION 1: CHAPTERS WITH STUDY NOTES (UP / TOP) */}
                      {notesChapterBuckets.withNotes.length > 0 ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                Chapters With Notes & Materials ({notesChapterBuckets.withNotes.length})
                              </h4>
                            </div>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              Ready To Study
                            </span>
                          </div>

                          {notesChapterBuckets.withNotes.map(({ chapter: ch, allDocs: allChDocs, filteredDocs: chDocs }) => {
                            return (
                              <div
                                key={ch.number}
                                className="rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700"
                              >
                                {/* Chapter Header */}
                                <div className="p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800">
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 shrink-0">
                                        {ch.number}
                                      </span>
                                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white break-words">
                                        {ch.title}
                                      </h3>
                                    </div>
                                    {ch.keyTopics && (
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                                        Topics: {ch.keyTopics}
                                      </p>
                                    )}
                                  </div>

                                  {/* Chapter Actions: Count Badge & Upload Button */}
                                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                                      {allChDocs.length} {allChDocs.length === 1 ? 'PDF' : 'PDFs'}
                                    </span>

                                    {canUpload && (
                                      <button
                                        type="button"
                                        onClick={() => openUploadStudio({ subject: activeRoom, chapterNumber: ch.number, chapterTitle: ch.title, category: 'notes' })}
                                        className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                                        title={`Upload notes directly to ${ch.number}`}
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add PDF</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Chapter PDFs List */}
                                <div className="p-3.5 sm:p-5">
                                  {chDocs.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                      {chDocs.map((doc) => {
                                        const docKey = getCanonicalDocKey(doc.streamUrl || doc.serverUrl || doc.name, doc.originalName || doc.name);
                                        const progress = readingMemory.getProgress(docKey);
                                        const hasProgress = progress && progress.currentPage > 1;

                                        return (
                                          <div
                                            key={doc.id}
                                            onClick={() => handleOpenDoc(doc)}
                                            className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                                          >
                                            <div>
                                              <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                                                  <FileText className="w-4 h-4" />
                                                </div>

                                                <div className="flex items-center gap-1 flex-wrap justify-end">
                                                  {doc.customFilter && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                                      {doc.customFilter}
                                                    </span>
                                                  )}

                                                  {hasProgress && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                                      <History className="w-2.5 h-2.5" /> p.{progress.currentPage}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>

                                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
                                                {doc.name || doc.originalName}
                                              </h4>
                                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-2">
                                                <span>{doc.size || `${((doc.sizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB`}</span>
                                                <span>•</span>
                                                <span>Class {toRomanStandard(doc.standard || activeStandard)}</span>
                                              </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                                              {hasProgress ? (
                                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                  <Eye className="w-3 h-3" /> Resume
                                                </span>
                                              ) : (
                                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                  <Eye className="w-3 h-3" /> Read PDF
                                                </span>
                                              )}

                                              <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                                {canUpload && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setEditingDoc(doc);
                                                      setEditDocChapter(doc.chapterNumber || ch.number || 'All');
                                                      setEditDocTag(doc.customFilter || (doc.tags && doc.tags[0]) || '');
                                                    }}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                                                    title="Edit Chapter & Tag"
                                                  >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                  </button>
                                                )}
                                                <a
                                                  href={getDownloadUrl(doc)}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  download={doc.originalName || doc.name}
                                                  className="p-1 rounded-lg text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                                  title="Download PDF"
                                                >
                                                  <Download className="w-3.5 h-3.5" />
                                                </a>
                                                {canUpload && (
                                                  <button
                                                    onClick={(e) => handleDeleteDocument(doc.id, e)}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                                                    title="Delete document"
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
                                  ) : (
                                    <div className="py-4 px-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                                      <p className="text-xs text-slate-500 dark:text-slate-400">
                                        No notes in {ch.number} matched the "{selectedCustomFilter}" filter.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-10 px-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-100 dark:border-amber-900">
                            <FileText className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            No Chapter Notes Uploaded Yet
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                            Add study material PDFs or select an empty chapter below to attach notes.
                          </p>
                          {canUpload && (
                            <button
                              type="button"
                              onClick={() => openUploadStudio({ subject: activeRoom, category: 'notes' })}
                              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Upload First Note</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Uncategorized / General Notes Section */}
                      {(() => {
                        const uncategorizedDocs = notesDocs.filter(
                          (d) => !activeRoomChapters.some((ch) => getDocsForChapter(ch, [d], effectiveStandard).length > 0)
                        );
                        if (uncategorizedDocs.length === 0) return null;

                        return (
                          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
                            <div className="p-4 sm:p-5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                              <div>
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                                  General & Comprehensive Subject Notes
                                </h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Full-syllabus guides, formula summaries, and unassigned reference materials
                                </p>
                              </div>
                              <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {uncategorizedDocs.length} PDFs
                              </span>
                            </div>

                            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                              {uncategorizedDocs.map((doc) => (
                                <div
                                  key={doc.id}
                                  onClick={() => handleOpenDoc(doc)}
                                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition-all cursor-pointer group flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                                        <FileText className="w-4 h-4" />
                                      </div>
                                      {doc.customFilter && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                          {doc.customFilter}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-600 transition-colors line-clamp-2">
                                      {doc.name || doc.originalName}
                                    </h4>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-2">
                                      <span>{doc.size || `${((doc.sizeBytes || 0) / (1024 * 1024)).toFixed(2)} MB`}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1">
                                      <Eye className="w-3 h-3" /> Read PDF
                                    </span>
                                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                      {canUpload && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingDoc(doc);
                                            setEditDocChapter(doc.chapterNumber || 'All');
                                            setEditDocTag(doc.customFilter || (doc.tags && doc.tags[0]) || '');
                                          }}
                                          className="p-1 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                                          title="Edit Chapter & Tag"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      <a
                                        href={getDownloadUrl(doc)}
                                        target="_blank"
                                        rel="noreferrer"
                                        download={doc.originalName || doc.name}
                                        className="p-1 rounded-lg text-slate-400 hover:text-brand-600 transition-colors"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                      {canUpload && (
                                        <button
                                          onClick={(e) => handleDeleteDocument(doc.id, e)}
                                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* SECTION 3: REMAINING CHAPTERS WITHOUT NOTES (NICHE / BOTTOM) */}
                      {notesChapterBuckets.withoutNotes.length > 0 && (
                        <div className="mt-8 pt-6 border-t-2 border-dashed border-slate-200 dark:border-slate-800 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 dark:bg-slate-600" />
                              <h4 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Remaining Chapters ({notesChapterBuckets.withoutNotes.length} without notes)
                              </h4>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowEmptyChaptersNotes(!showEmptyChaptersNotes)}
                              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>{showEmptyChaptersNotes ? 'Hide Remaining' : 'Show Remaining'}</span>
                              {showEmptyChaptersNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {showEmptyChaptersNotes && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {notesChapterBuckets.withoutNotes.map(({ chapter: ch }) => (
                                <div
                                  key={ch.number + ch.title}
                                  className="p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex items-center justify-between gap-3"
                                >
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-1 inline-block">
                                      {ch.number}
                                    </span>
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                      {ch.title}
                                    </h4>
                                  </div>

                                  {canUpload && (
                                    <button
                                      type="button"
                                      onClick={() => openUploadStudio({ subject: activeRoom, chapterNumber: ch.number, chapterTitle: ch.title, category: 'notes' })}
                                      className="px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
                                      title={`Upload notes for ${ch.number}`}
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>+ Upload</span>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ========================================================
                        VIEW MODE 2: ALL NOTES GRID VIEW
                    ======================================================== */
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
                            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 dark:hover:border-amber-500/50 hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
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

                                  {doc.customFilter && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                      {doc.customFilter}
                                    </span>
                                  )}

                                  {hasProgress && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                                      <History className="w-2.5 h-2.5" /> p.{progress.currentPage} ({progress.percent}%)
                                    </span>
                                  )}

                                  {/* Super Admin Upload Count Tracker */}
                                  {isSuperAdmin && (
                                    <span
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                                      title="Upload count tracker"
                                    >
                                      {doc.uploadCount || 1} {doc.uploadCount === 1 ? 'upload' : 'uploads'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors line-clamp-2 leading-snug">
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
                                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5" /> Read Notes
                                </span>
                              )}

                              <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                                {canUpload && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingDoc(doc);
                                      setEditDocChapter(doc.chapterNumber || matchedCh?.number || 'All');
                                      setEditDocTag(doc.customFilter || (doc.tags && doc.tags[0]) || '');
                                    }}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                                    title="Edit Chapter & Tag"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
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
                  )}
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
          {/* Cinematic Heroic Banner for HSC Class 12 Commerce */}
          <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-brand-900/15 via-purple-900/10 to-transparent dark:from-brand-950/50 dark:via-purple-950/30 dark:to-transparent border border-brand-500/20 dark:border-brand-400/25 shadow-2xl backdrop-blur-xl shrink-0">
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/25 text-[11px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
                  <span>Maharashtra State Board • HSC Class 12 Commerce Edition</span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  Academic Subject Rooms & Vault
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  Official Balbharati textbooks, handwritten toppers notes, solution keys, and past 10-year Maharashtra State Board examination papers.
                </p>
                {/* Feature highlight tags */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span className="px-2.5 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-brand-500" /> 9 Board Subject Rooms
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> 100% Maharashtra HSC Portion
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-sky-500" /> Continuous Scroll PDF Reader
                  </span>
                </div>
              </div>

              {canUpload && (
                <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
                  <button
                    onClick={() => {
                      openUploadStudio({
                        subject: availableSubjects[0]?.name || 'Book-Keeping & Accountancy (Accounts)',
                        category: 'notes',
                      });
                    }}
                    className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/25 flex items-center space-x-2 transition-all cursor-pointer hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Upload Notes / Textbook</span>
                  </button>
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="px-4 py-2.5 bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl border border-black/[0.06] dark:border-white/[0.08] flex items-center space-x-2 transition-all cursor-pointer"
                    title="Bulk upload and auto-segregate complete folders of study materials"
                  >
                    <FolderUp className="w-4 h-4" />
                    <span>Bulk Cloud Sync</span>
                  </button>
                </div>
              )}
            </div>
          </div>



          {/* Subject Rooms Grid */}
          {isLoading ? (
            <CardSkeleton count={6} />
          ) : filteredDeskSubjects.length === 0 ? (
            <div className="p-12 text-center bg-white/95 dark:bg-slate-900/95 rounded-3xl border-2 border-slate-200 dark:border-slate-800 space-y-3 shadow-lg">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">No subjects available</h3>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Subject rooms will appear here once loaded.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDeskSubjects.map((sub) => {
                const Icon = sub.icon;
                const metrics = subjectMetricsMap[sub.name] || { directDocsCount: 0, tBooks: 0, nDocs: 0, pCount: 0 };
                const tBooks = metrics.tBooks;
                const nDocs = metrics.nDocs;
                const pCount = metrics.pCount;

                return (
                  <div
                    key={sub.name}
                    className="p-6 rounded-[28px] bg-white/95 dark:bg-slate-900/95 border-2 border-slate-200 dark:border-slate-800/90 hover:border-indigo-500/60 dark:hover:border-indigo-400/60 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all group flex flex-col justify-between relative overflow-hidden"
                  >
                    {/* Top vibrant gradient highlight strip */}
                    <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${sub.colorGradient}`} />

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div
                          onClick={() => handleSelectRoom(sub.name)}
                          className={`w-13 h-13 rounded-2xl bg-gradient-to-br ${sub.colorGradient} flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 group-hover:rotate-1 transition-all cursor-pointer`}
                        >
                          <Icon className="w-7 h-7" />
                        </div>

                        <span className={`text-[11px] font-black px-3 py-1 rounded-full border shadow-xs ${sub.badgeColor}`}>
                          {sub.code}
                        </span>
                      </div>

                      <div onClick={() => handleSelectRoom(sub.name)} className="cursor-pointer space-y-1">
                        <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {sub.name}
                        </h3>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-2 leading-relaxed">
                          {sub.description}
                        </p>
                      </div>

                      {/* Fast Navigation Action Pills (High Contrast & Colorful) */}
                      <div className="flex items-center gap-2 pt-2 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRoom(sub.name, 'textbooks');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/80 dark:hover:bg-blue-900 text-[11px] font-black text-blue-900 dark:text-blue-100 border border-blue-300 dark:border-blue-700/80 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105"
                          title="Open Official Textbooks"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" />
                          <span>Textbooks ({tBooks})</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectRoom(sub.name, 'notes');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/80 dark:hover:bg-emerald-900 text-[11px] font-black text-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-700/80 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105"
                          title="Open Chapter Notes"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-300" />
                          <span>Notes ({nDocs})</span>
                        </button>

                        {pCount > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRoom(sub.name, 'pyq');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/80 dark:hover:bg-amber-900 text-[11px] font-black text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700/80 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105"
                            title="Open Board PYQ Papers"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                            <span>PYQs ({pCount})</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      onClick={() => handleSelectRoom(sub.name)}
                      className="pt-4 mt-4 border-t-2 border-slate-100 dark:border-slate-800/80 flex items-center justify-between cursor-pointer"
                    >
                      <div className="text-[11px] text-slate-700 dark:text-slate-300 font-extrabold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                        <span>Class 12 HSC Board Portion</span>
                      </div>

                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1.5 transition-transform flex items-center space-x-1">
                        <span>Enter Room</span>
                        <span>→</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Intelligent Bulk Uploader Modal */}
      {showBulkModal && (
        <BulkUploaderModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          defaultCategory="notes"
          onUploadSuccess={() => {
            // Instantly sync local documents and test papers into state
            const freshDocs = api.getLocalDocuments();
            if (freshDocs.length > 0) {
              setDocuments(freshDocs);
            }
            try {
              const cachedPapers = localStorage.getItem('aether_cached_test_papers');
              if (cachedPapers) {
                setTestPapers(JSON.parse(cachedPapers));
              }
            } catch {}
            loadContent();
          }}
        />
      )}

      {/* 🏷️ Interactive Tag Creation & PDF/Chapter Assignment Modal */}
      {showTagAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/70">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                    Create Tag & Assign Study Materials
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Choose which chapters & PDFs belong to this tag in {activeRoom}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTagAssignModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Step 1: Tag Name Input & Suggestion Pills */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>1. Tag Name</span>
                  <span className="text-[11px] font-normal text-slate-400">Required</span>
                </label>
                <input
                  type="text"
                  value={assignTagName}
                  onChange={(e) => setAssignTagName(e.target.value)}
                  placeholder="e.g. Theory Notes, Question Bank, Formula Sheet, Important Numericals"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
                {/* Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Quick ideas:</span>
                  {[
                    'Theory Notes',
                    'Question Bank',
                    'Formula Sheet',
                    'Summary & Revision',
                    'Solved Examples',
                    'Important Questions',
                    'Board Paper Solutions',
                    'Key Definitions',
                  ].map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setAssignTagName(idea)}
                      className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-lg border transition-all cursor-pointer ${
                        assignTagName.toLowerCase() === idea.toLowerCase()
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                      }`}
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Target Chapters Selector */}
              {activeRoomChapters.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      2. Filter / Assign by Chapters ({assignSelectedChapters.length} selected)
                    </label>
                    <span className="text-[11px] text-slate-400">Click a chapter to auto-select its PDFs</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                    {activeRoomChapters.map((ch) => {
                      const isSel = assignSelectedChapters.includes(ch.number);
                      const chDocCount = roomDocuments.filter(
                        (d) => getDocsForChapter(ch, [d], effectiveStandard).length > 0
                      ).length;

                      return (
                        <button
                          key={ch.number}
                          type="button"
                          onClick={() => handleToggleAssignChapter(ch.number)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSel
                              ? 'bg-brand-600 text-white border-brand-600 shadow-xs'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-brand-400'
                          }`}
                        >
                          <span>{ch.number}</span>
                          <span
                            className={`text-[10px] px-1 rounded-md ${
                              isSel ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {chDocCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Select which PDFs to include */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <span>3. Select PDFs to Keep in Tag ({assignSelectedDocIds.length} of {roomDocuments.length} selected)</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleSelectAllDocs}
                      className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                    >
                      {assignSelectedDocIds.length === roomDocuments.length && roomDocuments.length > 0
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  </div>
                </div>

                {/* PDF Search Filter */}
                {roomDocuments.length > 5 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={assignSearchFilter}
                      onChange={(e) => setAssignSearchFilter(e.target.value)}
                      placeholder="Search PDFs by title..."
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs pl-8 pr-3 py-1.5 rounded-xl outline-none"
                    />
                  </div>
                )}

                {/* Document List */}
                {roomDocuments.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No PDFs currently uploaded for {activeRoom}.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      You can still create this tag now, and it will be available when you upload new study materials!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {roomDocuments
                      .filter((d) => {
                        if (!assignSearchFilter.trim()) return true;
                        const q = assignSearchFilter.toLowerCase();
                        return (d.name || d.originalName || '').toLowerCase().includes(q);
                      })
                      .map((doc) => {
                        const isChecked = assignSelectedDocIds.includes(doc.id);
                        const matchedCh = activeRoomChapters.find(
                          (ch) => getDocsForChapter(ch, [doc], effectiveStandard).length > 0
                        );

                        return (
                          <div
                            key={doc.id}
                            onClick={() => handleToggleAssignDoc(doc.id)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isChecked
                                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 shadow-2xs'
                                : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleAssignDoc(doc.id)}
                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {doc.name || doc.originalName}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                                  {matchedCh && (
                                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                                      {matchedCh.number}
                                    </span>
                                  )}
                                  {doc.customFilter && (
                                    <span>Current tag: {doc.customFilter}</span>
                                  )}
                                  <span>{doc.size || 'PDF'}</span>
                                </div>
                              </div>
                            </div>

                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                isChecked
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {isChecked ? 'Included' : 'Add'}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <button
                type="button"
                onClick={() => setShowTagAssignModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!assignTagName.trim()}
                onClick={handleSaveTagAssignment}
                className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-gradient-to-r from-amber-600 to-brand-600 hover:from-amber-500 hover:to-brand-500 disabled:opacity-50 shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>
                  {assignSelectedDocIds.length > 0
                    ? `Save & Assign to ${assignSelectedDocIds.length} ${assignSelectedDocIds.length === 1 ? 'PDF' : 'PDFs'}`
                    : 'Create Tag'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ Quick Single Document Tag & Chapter Editor Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full overflow-hidden animate-scale-up">
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
              <div className="flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-brand-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Edit PDF Chapter & Tag
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 mb-1">Document:</p>
                <p className="text-xs font-extrabold text-slate-900 dark:text-white line-clamp-2">
                  {editingDoc.name || editingDoc.originalName}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Assigned Chapter
                </label>
                <select
                  value={editDocChapter}
                  onChange={(e) => setEditDocChapter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="All">General / All Chapters</option>
                  {activeRoomChapters.map((ch) => (
                    <option key={ch.number} value={ch.number}>
                      {ch.number}: {ch.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Filter Tag
                </label>
                {/* Suggestions */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {availableCustomFilters.slice(0, 6).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditDocTag(t)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                        editDocTag === t
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={editDocTag}
                  onChange={(e) => setEditDocTag(e.target.value)}
                  placeholder="e.g. Theory Notes, Question Bank, Formula Sheet"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSingleDocEdit}
                className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectRooms;

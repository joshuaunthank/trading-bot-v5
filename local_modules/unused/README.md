# Unused/Archived Code - June 26, 2025

## 📁 **Code Moved to Archive**

This directory contains code that was removed from the main codebase during cleanup but preserved in case it's needed for future development.

### **Removed Components**

1. **signalEngine.ts** - Signal generation engine (not currently used)
2. **tradingService.ts** - Trading operations service (not implemented)
3. **strategyFixer.ts** - Strategy file repair utility (limited use)

### **Removed Test Files**

1. **test-multi-panel-categorization.mjs** - Debug test for chart panels
2. **test-overtrading-integration.mjs** - Debug test for overtrading protection
3. **test-strategy-indicators.mjs** - Debug test for strategy indicators

### **Components Deleted Entirely**

1. **ChartView.tsx** (812 lines) - Duplicate of ChartPanel.tsx functionality
2. **StrategyRunner.tsx** (302 lines) - Unused component with incomplete navigation

---

## 📊 **Cleanup Impact**

- **Total Lines Removed**: ~1,200+ lines of redundant/unused code
- **Files Archived**: 6 backend utilities and test files
- **Files Deleted**: 2 frontend components
- **Unused Imports Cleaned**: 2 imports from ChartPanel.tsx

---

## ♻️ **Recovery Instructions**

If any of these files are needed in the future:

1. **For Archived Files**: Move back from `local_modules/unused/` to original location
2. **For Deleted Components**: Restore from git history if needed
3. **For Imports**: Re-add to component files as needed

---

**Result: Cleaner, more maintainable codebase focused on actually implemented features.**

const stagehand = require('@browserbasehq/stagehand');
console.log('Exports:', Object.keys(stagehand));
console.log('LLMClient available:', !!stagehand.LLMClient);

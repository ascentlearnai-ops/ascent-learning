
export interface SATSkill {
  title: string;
  description: string;
  mistakes: string;
  promptContext: string; // Context for AI generation
}

export interface SATDomain {
  id: string;
  title: string;
  description: string;
  skills: SATSkill[];
}

export const SAT_MATH_DOMAINS: SATDomain[] = [
  {
    id: 'algebra',
    title: 'Algebra (35%)',
    description: 'Linear equations, inequalities, and systems.',
    skills: [
      { 
        title: 'Linear Equations in One Variable', 
        description: 'Solving single linear equations, rearranging formulas.', 
        mistakes: 'Sign errors when moving terms across the equals sign.',
        promptContext: 'Focus on solving linear equations and rearranging formulas.'
      },
      { 
        title: 'Systems of Equations', 
        description: 'Solving systems algebraically (substitution, elimination).', 
        mistakes: 'Forgetting to solve for both x and y.',
        promptContext: 'Create systems of linear equations problems.'
      },
      { 
        title: 'Linear Functions & Modeling', 
        description: 'Interpreting slope, intercept, and writing models.', 
        mistakes: 'Confusing slope (rate of change) with y-intercept (initial value).',
        promptContext: 'Focus on word problems involving linear modeling.'
      }
    ]
  },
  {
    id: 'advanced_math',
    title: 'Advanced Math (35%)',
    description: 'Nonlinear functions: quadratics, exponentials, polynomials.',
    skills: [
      { 
        title: 'Quadratic Functions', 
        description: 'Factoring, quadratic formula, vertex form, parabolas.', 
        mistakes: 'Forgetting the +/- when taking square roots.',
        promptContext: 'Focus on quadratics, parabolas, and the discriminant.'
      },
      { 
        title: 'Exponential Functions', 
        description: 'Growth/decay models, compound interest.', 
        mistakes: 'Confusing linear growth (constant amount) with exponential growth (constant percent).',
        promptContext: 'Create exponential growth and decay problems.'
      },
      { 
        title: 'Radicals & Rationals', 
        description: 'Simplifying expressions with exponents and roots.', 
        mistakes: 'Incorrectly simplifying sums inside radicals.',
        promptContext: 'Focus on radical and rational equations.'
      }
    ]
  },
  {
    id: 'problem_solving',
    title: 'Problem Solving & Data (15%)',
    description: 'Ratios, rates, percentages, probability, and statistics.',
    skills: [
      { 
        title: 'Ratios & Percentages', 
        description: 'Unit rates, percent change, scale conversions.', 
        mistakes: 'Calculating percent of the wrong base value.',
        promptContext: 'Focus on percentages, ratios, and rates.'
      },
      { 
        title: 'Data Analysis', 
        description: 'Scatterplots, line of best fit, mean/median/mode.', 
        mistakes: 'Assuming correlation implies causation.',
        promptContext: 'Focus on interpreting data, charts, and statistics.'
      }
    ]
  },
  {
    id: 'geometry',
    title: 'Geometry & Trig (15%)',
    description: 'Area, volume, angles, triangles, and trigonometry.',
    skills: [
      { 
        title: 'Geometry & Area/Volume', 
        description: 'Circles, prisms, cylinders, area/volume formulas.', 
        mistakes: 'Using diameter instead of radius in circle formulas.',
        promptContext: 'Focus on geometry, volume, and surface area.'
      },
      { 
        title: 'Trigonometry', 
        description: 'SOH CAH TOA, special right triangles.', 
        mistakes: 'Mixing up sine and cosine relationships.',
        promptContext: 'Focus on right triangle trigonometry and the unit circle.'
      }
    ]
  }
];

export const SAT_READING_DOMAINS: SATDomain[] = [
  {
    id: 'craft_structure',
    title: 'Craft and Structure (28%)',
    description: 'Vocabulary, text structure, and purpose.',
    skills: [
      { 
        title: 'Words in Context', 
        description: 'Determining meaning of words using context clues.', 
        mistakes: 'Picking a common definition instead of the one fitting the context.',
        promptContext: 'Focus on vocabulary in context questions.'
      },
      { 
        title: 'Text Structure & Purpose', 
        description: 'Identifying organization and author purpose.', 
        mistakes: 'Confusing the main topic with a supporting detail.',
        promptContext: 'Focus on identifying text structure and author purpose.'
      }
    ]
  },
  {
    id: 'info_ideas',
    title: 'Information and Ideas (26%)',
    description: 'Central ideas, evidence, and inferences.',
    skills: [
      { 
        title: 'Central Ideas', 
        description: 'Identifying the main claim of a passage.', 
        mistakes: 'Selecting an answer that is too specific or too broad.',
        promptContext: 'Focus on main idea and summary questions.'
      },
      { 
        title: 'Command of Evidence', 
        description: 'Using text or graphs to support a claim.', 
        mistakes: 'Misinterpreting the data in a chart or graph.',
        promptContext: 'Focus on quantitative and textual evidence.'
      }
    ]
  },
  {
    id: 'conventions',
    title: 'Standard English Conventions (26%)',
    description: 'Grammar, punctuation, and sentence structure.',
    skills: [
      { 
        title: 'Boundaries & Punctuation', 
        description: 'Run-ons, fragments, commas, semicolons.', 
        mistakes: 'Using a comma to separate two independent clauses (comma splice).',
        promptContext: 'Focus on sentence boundaries, comma splices, and run-ons.'
      },
      { 
        title: 'Verb Form & Agreement', 
        description: 'Subject-verb agreement and verb tense consistency.', 
        mistakes: 'Matching the verb to a noun in a prepositional phrase instead of the subject.',
        promptContext: 'Focus on subject-verb agreement and verb tenses.'
      }
    ]
  },
  {
    id: 'expression',
    title: 'Expression of Ideas (20%)',
    description: 'Rhetorical synthesis and transitions.',
    skills: [
      { 
        title: 'Transitions', 
        description: 'Logical connections (however, therefore, consequently).', 
        mistakes: 'Choosing a transition that contradicts the relationship between sentences.',
        promptContext: 'Focus on transition words and logical flow.'
      },
      { 
        title: 'Rhetorical Synthesis', 
        description: 'Synthesizing notes to achieve a specific goal.', 
        mistakes: 'Including information that doesn\'t directly address the prompt\'s goal.',
        promptContext: 'Focus on rhetorical synthesis questions.'
      }
    ]
  }
];

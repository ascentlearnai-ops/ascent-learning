
export interface APUnit {
  title: string;
  topics: string;
}

export interface APCourse {
  id: string;
  title: string;
  category: 'Math' | 'Science' | 'History' | 'Social Science' | 'Arts' | 'Computer Science';
  description: string;
  units: APUnit[];
}

export const AP_COURSES: APCourse[] = [
  {
    id: 'ap-precalc',
    title: 'AP Precalculus',
    category: 'Math',
    description: 'Prepares students for calculus and other advanced math, focusing on functions and modeling.',
    units: [
      { title: 'Polynomial and Rational Functions', topics: 'Polynomial behavior, end behavior, zeros, graphing. Rational functions: asymptotes, discontinuities.' },
      { title: 'Exponential and Logarithmic Functions', topics: 'Properties, inverse relationships, solving equations, growth/decay models.' },
      { title: 'Trigonometric and Polar Functions', topics: 'Unit circle, graphs, amplitude, period, phase shift, polar coordinates.' }
    ]
  },
  {
    id: 'ap-calc-ab',
    title: 'AP Calculus AB',
    category: 'Math',
    description: 'First-semester college calculus: limits, derivatives, integrals, and applications.',
    units: [
      { title: 'Limits and Continuity', topics: 'Concept of limit, one-sided limits, continuity, discontinuities.' },
      { title: 'Differentiation: Definition and Basic Rules', topics: 'Derivative as rate of change, power/product/quotient rules.' },
      { title: 'Differentiation: Composite, Implicit, Inverse', topics: 'Chain rule, implicit differentiation, inverse trig derivatives.' },
      { title: 'Contextual Applications of Differentiation', topics: 'Motion, optimization, linearization, related rates.' },
      { title: 'Analytical Applications of Differentiation', topics: 'Mean Value Theorem, increasing/decreasing, concavity.' },
      { title: 'Integration and Accumulation of Change', topics: 'Riemann sums, definite integrals, Fundamental Theorem of Calculus.' },
      { title: 'Differential Equations', topics: 'Slope fields, separation of variables, exponential growth.' },
      { title: 'Applications of Integration', topics: 'Area between curves, volumes of solids of revolution.' }
    ]
  },
  {
    id: 'ap-calc-bc',
    title: 'AP Calculus BC',
    category: 'Math',
    description: 'Includes all AB content plus additional advanced topics.',
    units: [
      { title: 'Parametric, Polar, and Vector-Valued Functions', topics: 'Parametric motion, polar graphs, slopes of curves.' },
      { title: 'Infinite Sequences and Series', topics: 'Convergence tests, Taylor/Maclaurin series, power series.' }
    ]
  },
  {
    id: 'ap-human-geo',
    title: 'AP Human Geography',
    category: 'Social Science',
    description: 'Explains how humans organize space, cultures, economies, and politics.',
    units: [
      { title: 'Thinking Geographically', topics: 'Maps, scale, regions, GIS, spatial analysis.' },
      { title: 'Population and Migration', topics: 'Demographics, migration push-pull factors, population density.' },
      { title: 'Cultural Patterns and Processes', topics: 'Language, religion, ethnicity, cultural landscapes.' },
      { title: 'Political Patterns and Processes', topics: 'States, nations, borders, electoral geography.' },
      { title: 'Agriculture and Rural Land-Use', topics: 'Farming types, agricultural revolutions, rural land use.' },
      { title: 'Cities and Urban Land-Use', topics: 'Urbanization, city models, suburbanization, segregation.' },
      { title: 'Industrial and Economic Development', topics: 'Economic sectors, development indicators, globalization.' }
    ]
  },
  {
    id: 'ap-world',
    title: 'AP World History: Modern',
    category: 'History',
    description: 'Global developments from c. 1200 CE to the present.',
    units: [
      { title: 'The Global Tapestry (1200–1450)', topics: 'State-building in Afro-Eurasia/Americas, belief systems.' },
      { title: 'Networks of Exchange', topics: 'Silk Roads, Indian Ocean trade, cultural diffusion.' },
      { title: 'Land-Based Empires', topics: 'Gunpowder empires, state consolidation.' },
      { title: 'Transoceanic Interconnections', topics: 'Exploration, Columbian Exchange, maritime empires.' },
      { title: 'Revolutions', topics: 'Enlightenment, Atlantic revolutions, industrialization.' },
      { title: 'Consequences of Industrialization', topics: 'Imperialism, social changes, reform movements.' },
      { title: 'Global Conflict', topics: 'World Wars, genocides, political realignments.' },
      { title: 'Cold War and Decolonization', topics: 'Superpower rivalry, new states, non-aligned movement.' },
      { title: 'Globalization', topics: 'Economic globalization, technology, human rights.' }
    ]
  },
  {
    id: 'apush',
    title: 'AP U.S. History',
    category: 'History',
    description: 'Survey of U.S. history from pre-Columbian societies to the present.',
    units: [
      { title: 'Pre-Columbian to Early Colonization', topics: 'Native societies, European contact.' },
      { title: 'Colonial and Revolutionary Era', topics: 'Colonial society, independence, Constitution.' },
      { title: 'Nation Building and Sectionalism', topics: 'Market revolution, Jacksonian democracy, sectional conflict.' },
      { title: 'Civil War and Reconstruction', topics: 'Causes of war, emancipation, Reconstruction policies.' },
      { title: 'Industrialization and Gilded Age', topics: 'Big business, immigration, urbanization, labor.' },
      { title: 'Progressive Era and WWI', topics: 'Reform movements, imperialism, World War I.' },
      { title: 'Interwar, Depression, WWII', topics: '1920s, New Deal, World War II.' },
      { title: 'Cold War and Civil Rights', topics: 'Containment, Vietnam, Civil Rights movement.' },
      { title: 'Contemporary United States', topics: 'Globalization, political polarization, digital age.' }
    ]
  },
  {
    id: 'ap-art-history',
    title: 'AP Art History',
    category: 'Arts',
    description: 'Surveys global art from prehistory to the present.',
    units: [
      { title: 'Global Prehistory', topics: 'Paleolithic and Neolithic art.' },
      { title: 'Ancient Mediterranean', topics: 'Egypt, Greece, Rome, Near East.' },
      { title: 'Early Europe and Colonial Americas', topics: 'Medieval, Renaissance, Baroque.' },
      { title: 'Later Europe and Americas', topics: 'Modernism, Realism, Impressionism.' },
      { title: 'Indigenous Americas', topics: 'North, Central, and South American art.' },
      { title: 'Africa', topics: 'Art of African cultures and diaspora.' },
      { title: 'West and Central Asia', topics: 'Islamic art, Buddhist art.' },
      { title: 'South, East, and Southeast Asia', topics: 'Chinese, Japanese, Indian art.' },
      { title: 'The Pacific', topics: 'Oceanic art traditions.' },
      { title: 'Global Contemporary', topics: 'Art from 1980 to present.' }
    ]
  },
  {
    id: 'ap-physics-1',
    title: 'AP Physics 1',
    category: 'Science',
    description: 'Algebra-based mechanics, waves, and simple circuits.',
    units: [
      { title: 'Kinematics', topics: '1D and 2D motion, graphs.' },
      { title: 'Forces and Dynamics', topics: 'Newtons laws, friction, tension.' },
      { title: 'Work, Energy, and Power', topics: 'Conservation of energy, work-energy theorem.' },
      { title: 'Linear Momentum', topics: 'Impulse, collisions, conservation.' },
      { title: 'Torque and Rotation', topics: 'Rotational kinematics, torque.' },
      { title: 'Oscillations', topics: 'Simple harmonic motion, springs, pendulums.' }
    ]
  },
  {
    id: 'ap-physics-2',
    title: 'AP Physics 2',
    category: 'Science',
    description: 'Algebra-based fluids, thermo, E&M, optics, modern physics.',
    units: [
      { title: 'Fluids', topics: 'Density, pressure, buoyancy, flow.' },
      { title: 'Thermodynamics', topics: 'Heat, laws of thermodynamics, PV diagrams.' },
      { title: 'Electric Force, Field, and Potential', topics: 'Electrostatics, electric fields.' },
      { title: 'Electric Circuits', topics: 'DC circuits, resistors, capacitors.' },
      { title: 'Magnetism', topics: 'Magnetic fields, induction.' },
      { title: 'Optics', topics: 'Reflection, refraction, lenses, mirrors.' },
      { title: 'Modern Physics', topics: 'Quantum mechanics, nuclear physics.' }
    ]
  },
  {
    id: 'ap-physics-c-mech',
    title: 'AP Physics C: Mechanics',
    category: 'Science',
    description: 'Calculus-based mechanics.',
    units: [
      { title: 'Kinematics', topics: 'Calculus applications in motion.' },
      { title: 'Newtons Laws', topics: 'Forces, drag, varying forces.' },
      { title: 'Work, Energy, Power', topics: 'Conservative forces, potential energy functions.' },
      { title: 'Systems of Particles', topics: 'Center of mass, momentum.' },
      { title: 'Rotation', topics: 'Moment of inertia, rotational dynamics.' },
      { title: 'Oscillations and Gravitation', topics: 'SHM equations, orbits.' }
    ]
  },
  {
    id: 'ap-physics-c-em',
    title: 'AP Physics C: E&M',
    category: 'Science',
    description: 'Calculus-based electricity and magnetism.',
    units: [
      { title: 'Electrostatics', topics: 'Gauss Law, electric potential.' },
      { title: 'Conductors and Capacitors', topics: 'Capacitance, dielectrics.' },
      { title: 'Electric Circuits', topics: 'RC, RL, LC circuits.' },
      { title: 'Magnetic Fields', topics: 'Biot-Savart Law, Amperes Law.' },
      { title: 'Electromagnetism', topics: 'Induction, Maxwells equations.' }
    ]
  },
  {
    id: 'ap-stats',
    title: 'AP Statistics',
    category: 'Math',
    description: 'Data analysis, probability, and inference.',
    units: [
      { title: 'Exploring One-Variable Data', topics: 'Histograms, boxplots, normal distribution.' },
      { title: 'Exploring Two-Variable Data', topics: 'Scatterplots, correlation, regression.' },
      { title: 'Collecting Data', topics: 'Sampling, experiments, bias.' },
      { title: 'Probability', topics: 'Rules, random variables, binomial/geometric.' },
      { title: 'Sampling Distributions', topics: 'CLT, proportions, means.' },
      { title: 'Inference for Categorical Data', topics: 'Confidence intervals, z-tests.' },
      { title: 'Inference for Quantitative Data', topics: 't-intervals, t-tests.' }
    ]
  },
  {
    id: 'ap-csp',
    title: 'AP CS Principles',
    category: 'Computer Science',
    description: 'Broad intro to computing, internet, and data.',
    units: [
      { title: 'Creative Development', topics: 'Collaboration, design process.' },
      { title: 'Data and Information', topics: 'Binary, compression, big data.' },
      { title: 'Algorithms and Programming', topics: 'Variables, loops, abstraction.' },
      { title: 'Computer Systems and Networks', topics: 'Internet, routing, security.' },
      { title: 'Impact of Computing', topics: 'Ethics, digital divide, privacy.' }
    ]
  },
  {
    id: 'ap-csa',
    title: 'AP CS A',
    category: 'Computer Science',
    description: 'Java programming and algorithms.',
    units: [
      { title: 'Primitive Types', topics: 'Variables, casting, arithmetic.' },
      { title: 'Using Objects', topics: 'Methods, String, Math class.' },
      { title: 'Boolean Logic', topics: 'If/else, logical operators.' },
      { title: 'Iteration', topics: 'For loops, while loops.' },
      { title: 'Writing Classes', topics: 'Constructors, accessors, mutators.' },
      { title: 'Arrays and ArrayList', topics: 'Traversals, algorithms.' },
      { title: '2D Arrays', topics: 'Matrix manipulation.' },
      { title: 'Inheritance', topics: 'Subclasses, polymorphism.' },
      { title: 'Recursion', topics: 'Recursive methods, base cases.' }
    ]
  },
  {
    id: 'ap-psych',
    title: 'AP Psychology',
    category: 'Social Science',
    description: 'Scientific study of behavior and mental processes.',
    units: [
      { title: 'Scientific Foundations', topics: 'History, research methods, ethics.' },
      { title: 'Biological Bases', topics: 'Brain, neurons, nervous system.' },
      { title: 'Sensation and Perception', topics: 'Vision, hearing, processing.' },
      { title: 'Learning', topics: 'Conditioning, reinforcement.' },
      { title: 'Cognitive Psychology', topics: 'Memory, intelligence, language.' },
      { title: 'Developmental Psychology', topics: 'Childhood, adolescence, aging.' },
      { title: 'Clinical Psychology', topics: 'Disorders, therapy.' },
      { title: 'Social Psychology', topics: 'Group behavior, prejudice, attraction.' }
    ]
  },
  {
    id: 'ap-chem',
    title: 'AP Chemistry',
    category: 'Science',
    description: 'Chemistry with a focus on inquiry and models.',
    units: [
      { title: 'Atomic Structure', topics: 'Moles, electron config, periodicity.' },
      { title: 'Structure and Properties', topics: 'Bonding, VSEPR, IMFs.' },
      { title: 'Chemical Reactions', topics: 'Stoichiometry, net ionic equations.' },
      { title: 'Kinetics', topics: 'Rate laws, mechanisms.' },
      { title: 'Thermodynamics', topics: 'Enthalpy, entropy, Gibbs energy.' },
      { title: 'Equilibrium', topics: 'Le Chatelier, Keq.' },
      { title: 'Acids and Bases', topics: 'pH, buffers, titrations.' }
    ]
  },
  {
    id: 'ap-bio',
    title: 'AP Biology',
    category: 'Science',
    description: 'Evolution, energetics, genetics, and ecology.',
    units: [
      { title: 'Chemistry of Life', topics: 'Water, macromolecules.' },
      { title: 'Cell Structure', topics: 'Organelles, membranes, transport.' },
      { title: 'Cellular Energetics', topics: 'Enzymes, photosynthesis, respiration.' },
      { title: 'Cell Communication', topics: 'Signaling, cell cycle.' },
      { title: 'Heredity', topics: 'Meiosis, genetics.' },
      { title: 'Gene Expression', topics: 'DNA, RNA, protein synthesis.' },
      { title: 'Natural Selection', topics: 'Evolution, phylogeny.' },
      { title: 'Ecology', topics: 'Populations, ecosystems.' }
    ]
  },
  {
    id: 'ap-apes',
    title: 'AP Environmental Science',
    category: 'Science',
    description: 'Study of human-environment interactions.',
    units: [
      { title: 'Earth Systems', topics: 'Plate tectonics, soil, atmosphere.' },
      { title: 'Ecosystems', topics: 'Biomes, energy flow.' },
      { title: 'Populations', topics: 'Demographics, carrying capacity.' },
      { title: 'Land and Water Use', topics: 'Agriculture, mining, fishing.' },
      { title: 'Energy Resources', topics: 'Fossil fuels, renewable energy.' },
      { title: 'Pollution', topics: 'Air, water, waste.' },
      { title: 'Global Change', topics: 'Climate change, biodiversity loss.' }
    ]
  }
];

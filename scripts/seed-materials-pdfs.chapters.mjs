// 30 NCERT-aligned chapters (3 per subject per class), original study-note
// content (not reproduced textbook text) for Maths/Science/History, and
// theme/discussion notes (not the literal copyrighted story/poem text) for
// English. Computer Science follows the CBSE "Information Technology"
// skill-subject curriculum rather than a single official NCERT textbook,
// since NCERT does not publish one standard CS book for classes 9-10.

// Resolved at runtime (not hardcoded) — scripts/seed-full-dataset.sql
// assigns a fresh random UUID to every class/teacher on each run, so a
// fixed id here would go stale the moment someone reseeds.
export const CLASSES = {
  maths9: { subjectName: 'Mathematics', classGroupName: 'Class 9', teacherEmail: 'priya.sharma.test@schoolbuddy.dev' },
  maths10: { subjectName: 'Mathematics', classGroupName: 'Class 10', teacherEmail: 'priya.sharma.test@schoolbuddy.dev' },
  science9: { subjectName: 'Science', classGroupName: 'Class 9', teacherEmail: 'ravi.kumar.test@schoolbuddy.dev' },
  science10: { subjectName: 'Science', classGroupName: 'Class 10', teacherEmail: 'ravi.kumar.test@schoolbuddy.dev' },
  english9: { subjectName: 'English', classGroupName: 'Class 9', teacherEmail: 'anjali.verma.test@schoolbuddy.dev' },
  english10: { subjectName: 'English', classGroupName: 'Class 10', teacherEmail: 'anjali.verma.test@schoolbuddy.dev' },
  history9: { subjectName: 'History', classGroupName: 'Class 9', teacherEmail: 'vikram.singh.test@schoolbuddy.dev' },
  history10: { subjectName: 'History', classGroupName: 'Class 10', teacherEmail: 'vikram.singh.test@schoolbuddy.dev' },
  cs9: { subjectName: 'Computer Science', classGroupName: 'Class 9', teacherEmail: 'neha.gupta.test@schoolbuddy.dev' },
  cs10: { subjectName: 'Computer Science', classGroupName: 'Class 10', teacherEmail: 'neha.gupta.test@schoolbuddy.dev' },
};

export const CHAPTERS = [
  // ---- Mathematics, Class 9 ----
  {
    classKey: 'maths9', title: 'Number Systems Notes', chapter: 'Chapter 1',
    summary: 'Covers rational and irrational numbers, the real number line, and decimal expansions.',
    content: [
      'The number system studied in this chapter extends beyond the rational numbers (numbers that can be written as p/q, where q is not zero) to include irrational numbers — numbers whose decimal expansion is non-terminating and non-recurring, such as the square root of 2 or pi. Together, rational and irrational numbers make up the set of real numbers.',
      'Every real number corresponds to a unique point on the number line, and every point on the number line corresponds to a unique real number. Irrational numbers can be located on the number line using geometric constructions, such as repeated application of the Pythagoras theorem to represent square roots.',
      'A key skill in this chapter is rationalising the denominator of an expression that contains a surd (an irrational root), which means rewriting the expression so that no irrational number remains in the denominator. The laws of exponents, already familiar for integer powers, are also extended here to rational exponents.',
    ],
  },
  {
    classKey: 'maths9', title: 'Polynomials Notes', chapter: 'Chapter 2',
    summary: 'Introduces polynomials in one variable, their degree, zeros, and the remainder and factor theorems.',
    content: [
      'A polynomial in one variable is an algebraic expression made up of terms with non-negative integer powers of that variable, such as 3x^2 - 5x + 7. The highest power of the variable in the expression is called the degree of the polynomial — a degree 1 polynomial is linear, degree 2 is quadratic, and degree 3 is cubic.',
      'A zero of a polynomial is a value of the variable that makes the polynomial equal to zero. The Remainder Theorem states that when a polynomial p(x) is divided by (x - a), the remainder equals p(a) — this gives a quick way to find a remainder without performing long division.',
      'Closely related is the Factor Theorem: (x - a) is a factor of a polynomial p(x) if and only if p(a) = 0. This theorem is used to factorise polynomials of degree more than two by first identifying a zero through trial, and standard algebraic identities (such as the expansion of (a+b)^3) are often used to simplify this process.',
    ],
  },
  {
    classKey: 'maths9', title: 'Triangles — Congruence Notes', chapter: 'Chapter 7',
    summary: 'Covers the criteria for triangle congruence and properties of isosceles triangles.',
    content: [
      'Two triangles are said to be congruent if they are identical in shape and size — every corresponding side and angle matches exactly. Rather than checking all six measurements, a triangle can be shown congruent to another using one of a few shortcut criteria.',
      'The main congruence criteria are SAS (two sides and the included angle), ASA (two angles and the included side), SSS (all three sides), and RHS (hypotenuse and one side of a right triangle). Each criterion guarantees that the remaining sides and angles must also match, without needing to measure them directly.',
      'Using these criteria, several useful properties can be proved: in an isosceles triangle, the angles opposite the equal sides are themselves equal, and conversely, a triangle with two equal angles must have the sides opposite those angles equal. The chapter also introduces basic inequalities in a triangle, such as the fact that the side opposite a larger angle is longer.',
    ],
  },

  // ---- Mathematics, Class 10 ----
  {
    classKey: 'maths10', title: 'Real Numbers Notes', chapter: 'Chapter 1',
    summary: "Covers Euclid's division lemma, the Fundamental Theorem of Arithmetic, and proofs of irrationality.",
    content: [
      "Euclid's Division Lemma states that for any two positive integers a and b, there exist unique whole numbers q and r such that a = bq + r, where 0 <= r < b. Repeatedly applying this lemma gives Euclid's algorithm, an efficient method for finding the Highest Common Factor (HCF) of two positive integers without needing to list all their factors.",
      'The Fundamental Theorem of Arithmetic states that every composite number can be expressed as a product of prime numbers, and this factorisation is unique except for the order in which the primes are written. This theorem is the basis for finding the HCF and LCM of numbers using their prime factorisations.',
      'The chapter also revisits why certain numbers, such as the square root of a prime number, are irrational, using a proof by contradiction: assuming the number were rational leads to a logical inconsistency, so the original assumption must be false.',
    ],
  },
  {
    classKey: 'maths10', title: 'Arithmetic Progressions Notes', chapter: 'Chapter 5',
    summary: 'Introduces arithmetic progressions, the nth term formula, and the sum of n terms.',
    content: [
      'An arithmetic progression (AP) is a list of numbers in which each term after the first is obtained by adding a fixed number, called the common difference, to the previous term. For example, 3, 7, 11, 15, ... is an AP with a common difference of 4.',
      'If the first term of an AP is a and the common difference is d, the nth term is given by the formula a + (n-1)d. This allows any term to be found directly, without listing every term that comes before it.',
      'The sum of the first n terms of an AP can be found using the formula S_n = n/2 [2a + (n-1)d], which comes from pairing the first and last terms, the second and second-last terms, and so on. Arithmetic progressions appear naturally in real-life situations involving constant, steady change, such as savings that increase by a fixed amount each month.',
    ],
  },
  {
    classKey: 'maths10', title: 'Introduction to Trigonometry Notes', chapter: 'Chapter 8',
    summary: 'Covers trigonometric ratios in a right triangle and their standard values for common angles.',
    content: [
      'Trigonometry studies the relationship between the angles and sides of a right triangle. For a chosen acute angle in the triangle, six ratios can be formed from the lengths of the three sides — the most commonly used are sine (opposite/hypotenuse), cosine (adjacent/hypotenuse), and tangent (opposite/adjacent).',
      'These ratios depend only on the angle, not on the size of the triangle, which is what makes them so useful: once the ratio for a given angle is known, it applies to every right triangle containing that angle. Standard values are memorised for the common angles 0, 30, 45, 60, and 90 degrees.',
      'The chapter also introduces basic trigonometric identities, such as sin^2(A) + cos^2(A) = 1, which hold true for every value of the angle A and are used to simplify trigonometric expressions and solve equations involving them.',
    ],
  },

  // ---- Science, Class 9 ----
  {
    classKey: 'science9', title: 'Atoms and Molecules Notes', chapter: 'Chapter 3',
    summary: 'Covers the laws of chemical combination, atomic mass, and how atoms combine into molecules.',
    content: [
      'Chemical reactions follow two fundamental laws: the Law of Conservation of Mass, which states that mass is neither created nor destroyed in a chemical reaction, and the Law of Constant Proportions, which states that a given compound always contains the same elements combined in the same fixed proportion by mass, regardless of its source.',
      'An atom is the smallest particle of an element that can take part in a chemical reaction, and each element is assigned a relative atomic mass that compares it to a standard (the carbon-12 atom). Atoms rarely exist alone — they combine in fixed ratios to form molecules, held together by chemical bonds.',
      'A molecule can be made of atoms of the same element (like O2, oxygen gas) or of different elements (like H2O, water) — the latter is called a compound. The chapter also introduces ions, which are charged particles formed when an atom gains or loses electrons, and how chemical formulae are written to represent the composition of molecules and ionic compounds.',
    ],
  },
  {
    classKey: 'science9', title: 'The Fundamental Unit of Life Notes', chapter: 'Chapter 5',
    summary: 'Introduces cell theory and the structure and function of the major cell organelles.',
    content: [
      'The cell is the basic structural and functional unit of all living organisms — every living thing is made of one or more cells, and all cells arise from pre-existing cells. This is the core idea of cell theory. Organisms made of a single cell are called unicellular, while those made of many cells are multicellular.',
      'Cells are broadly classified as prokaryotic, which lack a defined nucleus and membrane-bound organelles (as in bacteria), or eukaryotic, which have a well-defined nucleus enclosed by a nuclear membrane along with various specialised organelles (as in plants, animals, and fungi).',
      'Key organelles include the nucleus, which houses the genetic material and controls cell activities; mitochondria, often called the powerhouse of the cell because they release energy through respiration; and, in plant cells, chloroplasts, which carry out photosynthesis, and a rigid cell wall that gives the cell structural support in addition to the cell membrane found in all cells.',
    ],
  },
  {
    classKey: 'science9', title: 'Force and Laws of Motion Notes', chapter: 'Chapter 8',
    summary: "Covers Newton's three laws of motion, inertia, and momentum with everyday examples.",
    content: [
      "Newton's First Law of Motion, also called the law of inertia, states that an object at rest stays at rest and an object in motion continues moving at constant velocity, unless acted on by an unbalanced external force. This resistance to a change in motion is called inertia, and it depends on the mass of the object — heavier objects have greater inertia.",
      "Newton's Second Law relates force, mass, and acceleration: the force acting on an object equals its mass multiplied by its acceleration (F = ma). This means a given force produces a larger acceleration on a lighter object than on a heavier one, and it also introduces momentum — the product of an object's mass and velocity — as a measure of the quantity of motion it has.",
      "Newton's Third Law states that for every action, there is an equal and opposite reaction — when one object exerts a force on a second object, the second exerts an equal force back on the first, in the opposite direction. This is seen when walking (pushing the ground backward propels you forward) or when a balloon releases air and moves in the opposite direction.",
    ],
  },

  // ---- Science, Class 10 ----
  {
    classKey: 'science10', title: 'Acids, Bases and Salts Notes', chapter: 'Chapter 2',
    summary: 'Covers the properties of acids and bases, the pH scale, neutralisation, and common salts.',
    content: [
      'Acids are substances that taste sour and turn blue litmus paper red, while bases taste bitter, feel soapy, and turn red litmus paper blue. Indicators such as litmus, phenolphthalein, and methyl orange change colour depending on whether a solution is acidic or basic, making them useful for testing an unknown substance.',
      'The strength of acids and bases is measured using the pH scale, which runs from 0 to 14. A pH below 7 indicates an acidic solution, a pH above 7 indicates a basic (alkaline) solution, and a pH of exactly 7 is neutral, as in pure water. The scale is logarithmic, so each whole-number step represents a tenfold change in acidity or alkalinity.',
      'When an acid and a base react, they neutralise each other to form a salt and water — this is called a neutralisation reaction. Common salts, such as sodium chloride (table salt), are produced this way, and many everyday substances, including antacids used to relieve acidity, work by applying this neutralisation principle.',
    ],
  },
  {
    classKey: 'science10', title: 'Life Processes Notes', chapter: 'Chapter 5',
    summary: 'Gives an overview of nutrition, respiration, transportation, and excretion in living organisms.',
    content: [
      'Living organisms must continuously carry out certain basic functions to maintain themselves and stay alive — these are called life processes. Nutrition is the process by which an organism obtains and uses food for energy and growth; it can be autotrophic, as in plants that make their own food through photosynthesis, or heterotrophic, as in animals that consume other organisms.',
      'Respiration is the process of breaking down food to release energy, usually using oxygen (aerobic respiration), though some organisms can respire without oxygen (anaerobic respiration), releasing comparatively less energy. Transportation moves nutrients, gases, and waste products around the body — in humans, this is the job of the circulatory system, centred on the heart and blood vessels.',
      'Excretion is the process of removing waste products, particularly nitrogenous waste, from the body — in humans this is primarily carried out by the kidneys, which filter the blood and produce urine. Together, these life processes work in a coordinated way to keep an organism functioning.',
    ],
  },
  {
    classKey: 'science10', title: 'Light — Reflection and Refraction Notes', chapter: 'Chapter 9',
    summary: 'Covers the laws of reflection and refraction, spherical mirrors, and lenses.',
    content: [
      'Reflection of light occurs when light bounces off a surface, and it follows two laws: the angle of incidence equals the angle of reflection, and the incident ray, reflected ray, and normal all lie in the same plane. Spherical mirrors — concave (curving inward) and convex (curving outward) — form images whose size, position, and nature depend on where the object is placed relative to the mirror.',
      'Refraction occurs when light passes from one transparent medium into another and changes speed, causing it to bend at the boundary between the two media. The amount of bending depends on the refractive index of the two media, and this bending is what makes a straw appear bent when placed in a glass of water.',
      'Lenses use refraction to form images and are classified as convex (converging) or concave (diverging), depending on their shape. Convex lenses can form either real or virtual images depending on the object distance, and are used to correct long-sightedness, while concave lenses always form virtual images and are used to correct short-sightedness.',
    ],
  },

  // ---- English, Class 9 (Beehive) — study notes about themes, not the original copyrighted text ----
  {
    classKey: 'english9', title: 'The Fun They Had — Study Notes', chapter: 'Beehive, Prose',
    summary: "Discussion notes on themes in Isaac Asimov's story about the future of education.",
    content: [
      'This short story by Isaac Asimov is set in the future, where children are taught at home by mechanical teachers and have never seen a school in the way we know it today. The story follows two children, Margie and Tommy, who come across an old printed book describing a school with a human teacher and other children learning together — a concept that feels strange and old-fashioned to them.',
      'A central theme is the contrast between personalised, isolated, mechanical learning and the traditional, social classroom experience. Margie finds herself curious and a little envious of the children in the old book, who got to learn together and even enjoyed going to school, unlike her own solitary, scheduled lessons with a mechanical teacher.',
      'The story invites discussion about what might be gained or lost as learning becomes more individualised and technology-driven — including the social, emotional, and collaborative aspects of learning that happen when students learn together in the same place, which the story suggests the children in the future quietly miss without fully realising it.',
    ],
  },
  {
    classKey: 'english9', title: 'My Childhood — Study Notes', chapter: 'Beehive, Prose',
    summary: "Discussion notes on themes in A.P.J. Abdul Kalam's autobiographical account of his early life.",
    content: [
      "This autobiographical excerpt describes the early life of A.P.J. Abdul Kalam, who would go on to become a renowned scientist and the President of India. It recalls his modest upbringing in Rameswaram, his close relationships with family and childhood friends from different religious backgrounds, and the strong values of honesty and hard work instilled in him from a young age.",
      'A recurring theme is communal harmony — Kalam describes friendships and mutual respect among people of different faiths in his hometown, portraying a community where religious differences did not divide people in everyday life.',
      "The account also highlights the influence of his teachers and mentors, who encouraged his curiosity about flight and science, planting the early seeds of his future career. The excerpt is often discussed for how it connects a person's humble beginnings and strong early values to the achievements of later life.",
    ],
  },
  {
    classKey: 'english9', title: 'The Road Not Taken — Study Notes', chapter: 'Beehive, Poetry',
    summary: "Discussion notes on structure, symbolism, and theme in Robert Frost's well-known poem.",
    content: [
      "In this poem, the speaker stands at a fork in a forest path and must choose between two roads that look fairly similar, though one appears slightly less worn. The poem is structured in four stanzas and uses the image of a literal road as an extended metaphor for the choices and decisions a person makes in life.",
      'A key point for discussion is that the poem does not claim the chosen road was objectively better — the speaker admits both paths were "really about the same" that morning — yet anticipates that, looking back in the future, they will describe the choice as having "made all the difference." This gap between the moment of choosing and the story told about it later is central to interpreting the poem.',
      'The poem is often read as being about individuality and the uncertainty of decision-making, rather than a simple message to always choose the less popular path. Its tone is reflective, and the final lines are deliberately open to more than one interpretation.',
    ],
  },

  // ---- English, Class 10 (First Flight) ----
  {
    classKey: 'english10', title: 'A Letter to God — Study Notes', chapter: 'First Flight, Prose',
    summary: 'Discussion notes on faith, irony, and human nature in this short story.',
    content: [
      'This story centres on Lencho, a farmer who has complete faith that God will provide for him and his family, especially after a hailstorm destroys his crop and ruins his only source of income for the year. Confident that his prayers will be answered directly, he writes a letter addressed simply "to God," asking for a specific sum of money to replant his fields.',
      'The postmaster, moved by Lencho\'s faith, decides to collect money from himself and his co-workers to send a reply, since he cannot bear to let that faith be shaken. However, he can only gather about a third of the amount Lencho asked for.',
      "The story's central irony appears in its final twist: when Lencho receives the money, instead of being grateful, he assumes the post office staff must have stolen part of it, and writes an angry follow-up letter demanding the rest — revealing his certainty in his own faith even as he doubts the honesty of the people who actually helped him. This irony is the main point for class discussion.",
    ],
  },
  {
    classKey: 'english10', title: 'Nelson Mandela: Long Walk to Freedom — Study Notes', chapter: 'First Flight, Prose',
    summary: "Discussion notes on freedom, courage, and ideas from Nelson Mandela's inauguration speech.",
    content: [
      'This excerpt is adapted from Nelson Mandela\'s autobiography and recalls the day of his inauguration as President of South Africa in 1994, following the end of apartheid. Mandela reflects on what true freedom means, arguing that oppression dehumanises both the oppressed and the oppressor, and that the struggle for freedom is therefore a shared one.',
      'A central theme is his idea of "twin obligations" — the duty to one\'s family, and the duty to one\'s people and country — and how, for Mandela, fulfilling the second obligation meant years of personal sacrifice, including decades spent in prison.',
      "The excerpt is often discussed for its central message that reaching one level of freedom reveals further responsibilities, comparing the long walk to freedom to climbing a hill — each height reached only reveals more hills still to climb — and for its broader reflection on courage not as the absence of fear, but as the triumph over it.",
    ],
  },
  {
    classKey: 'english10', title: 'Dust of Snow — Study Notes', chapter: 'First Flight, Poetry',
    summary: "Discussion notes on theme and structure in Robert Frost's short two-stanza poem.",
    content: [
      'This is a very short poem of just two stanzas, in which the speaker describes a small, ordinary moment: a crow shakes snow from a hemlock tree, and some of that dust of snow falls on the speaker below. This brief, almost accidental incident changes the speaker\'s mood, "saving" part of a day they had been regretting.',
      'A key discussion point is the contrast the poem sets up between two symbols usually seen negatively — the crow (often associated with bad luck) and the hemlock tree (associated with poison or sorrow) — and how, despite these associations, the small moment they create brings the speaker an unexpected feeling of relief and calm.',
      'The poem is often used to discuss how small, simple moments in nature can shift a person\'s mood, and how something ordinarily viewed as a "bad omen" can, in a specific moment, have a surprisingly positive effect — encouraging a closer look at how we assign meaning to everyday symbols.',
    ],
  },

  // ---- History, Class 9 (India and the Contemporary World I) ----
  {
    classKey: 'history9', title: 'Socialism in Europe and the Russian Revolution Notes', chapter: 'Chapter 3',
    summary: 'Covers the rise of socialist ideas in Europe and the events of the 1917 Russian Revolution.',
    content: [
      'In the nineteenth century, as industrialisation created large, often poorly paid working classes in European cities, socialist ideas grew in popularity — proposing that property and production should be collectively or state-owned rather than privately controlled, in order to reduce inequality between workers and owners.',
      'In Russia, discontent under the autocratic rule of the Tsar, worsened by the hardships of the First World War, led to the February Revolution of 1917, which forced Tsar Nicholas II to abdicate. Later that year, the October Revolution saw the Bolsheviks, led by Vladimir Lenin, seize power from the provisional government.',
      'The revolution led to major changes: private land was redistributed to peasants, factories were taken over by the state, and Russia eventually became the Soviet Union, establishing the first major communist state. These events had a lasting influence on political movements across the rest of the twentieth century.',
    ],
  },
  {
    classKey: 'history9', title: 'Nazism and the Rise of Hitler Notes', chapter: 'Chapter 4',
    summary: 'Covers the conditions that enabled Nazism to rise in Germany and its consequences.',
    content: [
      "Germany's defeat in the First World War and the harsh terms of the Treaty of Versailles, including heavy reparations and loss of territory, left the country economically devastated and humiliated. The Weimar Republic that governed Germany afterward struggled with political instability and, later, the Great Depression, which caused mass unemployment.",
      'In this environment of crisis, Adolf Hitler and the Nazi Party gained support by promising to restore German pride and economic stability, blaming Jews and other minority groups for the country\'s problems through a racist and extremely nationalist ideology. Hitler became Chancellor in 1933 and quickly dismantled democratic institutions to establish a dictatorship.',
      'Nazi rule led to the systematic persecution and genocide of six million Jews and millions of others during the Holocaust, and ultimately to the outbreak of the Second World War in 1939. This chapter examines both the economic and social conditions that allowed such an ideology to take hold, and its devastating consequences.',
    ],
  },
  {
    classKey: 'history9', title: 'Forest Society and Colonialism Notes', chapter: 'Chapter 5',
    summary: 'Covers deforestation and the impact of colonial forest policies on forest-dwelling communities.',
    content: [
      "During the colonial period, forests were increasingly cleared to meet the needs of a growing economy — for railway sleepers, ships, and agricultural land — leading to widespread deforestation across India. The colonial government also introduced 'scientific forestry', which favoured planting straight rows of a single commercially useful tree species over the natural diversity of a forest.",
      'New forest laws divided forests into categories and restricted the traditional rights of communities who depended on forests for grazing, hunting, and collecting produce — activities that were often criminalised as a result, even though they had been practiced sustainably for generations.',
      'These changes caused great hardship for forest-dwelling and pastoral communities, who lost access to resources that had long supported their way of life, and led to resistance movements in various regions against colonial forest policy. The chapter uses this history to explore the relationship between economic development, environmental change, and the rights of local communities.',
    ],
  },

  // ---- History, Class 10 (India and the Contemporary World II) ----
  {
    classKey: 'history10', title: 'The Rise of Nationalism in Europe Notes', chapter: 'Chapter 1',
    summary: 'Covers how nationalism grew in nineteenth-century Europe and led to the unification of nations.',
    content: [
      "The idea of nationalism — the belief that people sharing a common language, culture, or history should form their own independent nation — gained strength in Europe following the French Revolution, which introduced ideas of citizenship and collective identity that spread across the continent.",
      'This period saw the unification of previously fragmented regions into single nations, most notably the unification of Italy under the leadership of figures like Giuseppe Garibaldi, and the unification of Germany, led by Otto von Bismarck through a combination of diplomacy and war.',
      'Nationalism during this era was closely tied to romanticism in art and culture, which celebrated folk traditions, language, and a shared sense of history as the foundation of national identity. The chapter examines how these ideas reshaped the political map of Europe over the course of the century.',
    ],
  },
  {
    classKey: 'history10', title: 'Nationalism in India Notes', chapter: 'Chapter 2',
    summary: "Covers the major phases of India's freedom struggle under Mahatma Gandhi's leadership.",
    content: [
      "After the First World War, Mahatma Gandhi emerged as a central figure in India's struggle for independence, introducing the method of satyagraha — non-violent resistance — as a way to oppose British colonial rule. The Non-Cooperation Movement of the early 1920s called on Indians to withdraw support from British institutions, schools, and goods.",
      'This was followed, in the early 1930s, by the Civil Disobedience Movement, sparked by the Salt March, in which Gandhi and his followers walked to the coast to make salt in defiance of the British salt tax — a powerful symbolic act of resistance against an unjust law.',
      'The chapter also covers the Quit India Movement of 1942, launched during the Second World War, which demanded an immediate end to British rule. Together, these movements mobilised people across different regions and backgrounds, making nationalism in India a genuinely mass movement rather than one confined to a small political elite.',
    ],
  },
  {
    classKey: 'history10', title: 'The Age of Industrialisation Notes', chapter: 'Chapter 4',
    summary: 'Covers the growth of the factory system in Europe and the effects of industrialisation in colonial India.',
    content: [
      'Before factories became widespread, much production in Europe took place through "proto-industrialisation" — a system where merchants supplied raw materials to workers producing goods in their own homes, in the countryside, spreading production across many small household units rather than one centralised location.',
      'Over time, factories emerged as a more efficient way to organise large-scale production using machinery, fundamentally changing how goods were made and how workers were employed, though this transition took decades and did not fully replace older forms of production immediately.',
      'In colonial India, industrialisation took a different path — Indian industries, such as textile manufacturing, had to compete against cheap machine-made imports from Britain, and colonial trade policies generally favoured British industry over Indian producers. The chapter contrasts these differing industrial experiences in Europe and colonial India.',
    ],
  },

  // ---- Computer Science, Class 9 (CBSE Information Technology-style skill curriculum) ----
  {
    classKey: 'cs9', title: 'Introduction to Computer Networks Notes', chapter: 'Unit 1',
    summary: 'Introduces what a computer network is, common network types, and basic topologies.',
    content: [
      'A computer network is a group of two or more computers (or other devices) connected together so they can share data, resources like printers, and an internet connection. Networks are commonly classified by their size and span: a Local Area Network (LAN) connects devices within a single building or campus, while a Wide Area Network (WAN) connects devices across cities or countries — the internet itself is the largest WAN.',
      'Devices in a network can be arranged in different physical or logical layouts, called topologies. In a star topology, every device connects to a central device such as a switch; in a bus topology, all devices share a single common communication line; and in a ring topology, devices are connected in a closed loop, with data passing from one device to the next.',
      'The internet is a global network of networks, and accessing it typically requires an Internet Service Provider (ISP). Basic networking concepts introduced here — such as IP addresses, which uniquely identify each device on a network — form the foundation for understanding how devices communicate with each other.',
    ],
  },
  {
    classKey: 'cs9', title: 'Database Concepts Notes', chapter: 'Unit 2',
    summary: 'Introduces databases, DBMS, and the basic structure of tables, rows, and columns.',
    content: [
      'A database is an organised collection of related data, stored in a way that makes it easy to access, manage, and update. Rather than storing data in scattered files, a database groups related information together — for example, a school database might store student records, attendance, and grades in a structured, connected way.',
      'A Database Management System (DBMS) is the software used to create, access, and manage databases. It allows users to add, search, update, and delete data efficiently, while also controlling who is allowed to access or change particular information.',
      'In a typical relational database, data is organised into tables, where each table consists of rows (also called records, each representing one entry, such as one student) and columns (also called fields, each representing one type of information, such as a name or a date of birth). Each table usually has a primary key — a column, such as a unique student ID, that identifies each row without any duplicates.',
    ],
  },
  {
    classKey: 'cs9', title: 'Cyber Safety Notes', chapter: 'Unit 3',
    summary: 'Covers safe internet practices, password security, and awareness of common online risks.',
    content: [
      'Cyber safety refers to the practice of protecting yourself and your personal information while using the internet. This includes being careful about what personal details — such as your address, phone number, or school name — are shared publicly on social media or with people you don\'t know well online.',
      'Strong passwords are an important first line of defence: a good password is long, combines letters, numbers, and symbols, avoids obvious personal information, and is not reused across multiple accounts. Many services also offer two-factor authentication, which adds a second verification step beyond just a password.',
      'Students should also be aware of risks such as cyberbullying (using the internet to harass or intimidate someone), phishing (fake messages designed to trick people into revealing personal information), and the importance of checking privacy settings on social media accounts to control who can see shared content. Reporting inappropriate behaviour to a trusted adult is an important part of staying safe online.',
    ],
  },

  // ---- Computer Science, Class 10 ----
  {
    classKey: 'cs10', title: 'Introduction to Python Programming Notes', chapter: 'Unit 1',
    summary: 'Introduces the Python language, variables, basic data types, and simple input/output.',
    content: [
      'Python is a popular, beginner-friendly programming language known for its simple, readable syntax. A Python program is made up of statements that the computer executes in order, and unlike many other languages, Python does not require explicit type declarations or end-of-line symbols, which makes it a common first language to learn.',
      'A variable is a named location used to store a value, created simply by assigning it, for example: age = 14. Python has several basic data types, including integers (whole numbers), floats (decimal numbers), strings (text, written in quotes), and booleans (True or False values).',
      'Basic input and output are handled using the input() function, which pauses the program to accept text typed by the user, and the print() function, which displays output on the screen. These two functions are usually among the first tools students use to write simple interactive programs.',
    ],
  },
  {
    classKey: 'cs10', title: 'Conditional Statements and Loops Notes', chapter: 'Unit 2',
    summary: 'Covers if/elif/else decision-making and for/while loops for repeating actions in Python.',
    content: [
      'Conditional statements allow a program to make decisions and execute different code depending on whether a condition is true or false. In Python, this is done using if, elif (short for "else if"), and else, which let a program branch between several possible paths based on one or more conditions.',
      'Loops allow a block of code to be repeated multiple times without rewriting it. A for loop repeats a block of code a specific number of times, or once for each item in a sequence such as a list — useful when the number of repetitions is known in advance.',
      'A while loop, by contrast, repeats a block of code as long as a given condition remains true, which is useful when the number of repetitions is not known ahead of time, such as repeating an action until the user enters a correct password. Care must be taken to ensure the condition eventually becomes false, or the loop will run forever.',
    ],
  },
  {
    classKey: 'cs10', title: 'Working with Functions Notes', chapter: 'Unit 3',
    summary: 'Introduces user-defined functions, parameters, and return values in Python.',
    content: [
      'A function is a named, reusable block of code designed to perform a specific task. Instead of repeating the same code every time a task needs to be done, a function can be defined once and then called, by name, wherever it is needed — making programs shorter, more organised, and easier to fix or update.',
      'In Python, a function is defined using the def keyword, followed by the function name and a set of parentheses that may contain parameters — placeholder values the function expects to receive each time it is called, such as def add(a, b):.',
      'A function can send a result back to wherever it was called from using the return statement. This returned value can then be stored in a variable or used directly in further calculations, which is what allows functions to be combined and reused flexibly throughout a program.',
    ],
  },
];

function calculateProjectMatchScore(expert, project) {
  let score = 0;
  
  // Domain Match (40% weight)
  if (expert.domain_expertise && project.domain_expertise) {
    const expertDomains = Array.isArray(expert.domain_expertise) ? expert.domain_expertise : [expert.domain_expertise];
    if (expertDomains.includes(project.domain_expertise)) {
      score += 40;
    }
  }
  
  // Subskills Match (30% weight)
  if (expert.subskills && project.subskills && 
      Array.isArray(expert.subskills) && Array.isArray(project.subskills)) {
    const subskillMatches = expert.subskills.filter(skill => 
      project.subskills.includes(skill)
    ).length;
    if (project.subskills.length > 0) {
      score += (subskillMatches / project.subskills.length) * 30;
    }
  }
  
  // General Skills Match (20% weight)
  if (expert.required_expertise && project.required_expertise &&
      Array.isArray(expert.required_expertise) && Array.isArray(project.required_expertise)) {
    const skillMatches = expert.required_expertise.filter(skill => 
      project.required_expertise.includes(skill)
    ).length;
    if (project.required_expertise.length > 0) {
      score += (skillMatches / project.required_expertise.length) * 20;
    }
  }
  
  // Rate Compatibility (10% weight)
  if (expert.hourly_rate && project.hourly_rate) {
    // Expert rate should be within 20% of project rate (flexible matching)
    const rateDifference = Math.abs(expert.hourly_rate - project.hourly_rate) / project.hourly_rate;
    if (rateDifference <= 0.2) {
      score += 10;
    } else if (rateDifference <= 0.5) {
      score += 5; // Partial points for reasonable rate difference
    }
  }
  
  return Math.min(score, 100); // Cap at 100%
}

module.exports = { calculateProjectMatchScore };

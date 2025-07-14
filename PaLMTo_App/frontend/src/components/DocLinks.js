import React from 'react';

function DocLinks() {
    return (
        <div className="doc-link-container">
          <a href="https://github.com/Cherisea/PaLMTool/blob/main/README.md" 
             target="_blank" 
             rel="noopener noreferrer" 
             className="doc-link"
            >
            Doc
          </a>

          <a href="https://pypi.org/project/Palmto-gen/" 
             target="_blank" 
             rel="noopener noreferrer" 
             className="doc-link"
             >
             Library
          </a>

          <a href="https://www.researchgate.net/publication/385347801_Realistic_Trajectory_Generation_using_Simple_Probabilistic_Language_Models" 
             target="_blank" 
             rel="noopener noreferrer" 
             className="doc-link"
             >
             Paper
          </a>
      </div>
    );
}

export default DocLinks;
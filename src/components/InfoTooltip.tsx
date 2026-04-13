import React, { useState } from 'react';

interface Props {
  text: string;
}

const InfoTooltip: React.FC<Props> = ({ text }) => {
  const [show, setShow] = useState(false);

  return (
    <div 
      className="info-tooltip-wrap" 
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => { e.stopPropagation(); setShow(!show); }}
    >
      <span className="info-icon">i</span>
      {show && (
        <div className="info-tooltip-content">
          {text}
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;

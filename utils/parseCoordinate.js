const parseCoordinate = (value, type = 'lat') => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = parseFloat(value);

  if (isNaN(parsed)) {
    return null;
  }


  if (type === 'lat' && (parsed < -90 || parsed > 90)) {
    return null;
  }
  
  if (type === 'lng' && (parsed < -180 || parsed > 180)) {
    return null;
  }

  return parsed;
};

export default parseCoordinate;
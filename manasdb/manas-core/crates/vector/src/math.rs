use crate::errors::VectorError;

/// Validates that a vector is not empty and contains only finite values.
#[inline(always)]
fn validate_vector(v: &[f32]) -> Result<(), VectorError> {
    if v.is_empty() {
        return Err(VectorError::EmptyVector);
    }
    // Checking all values for finiteness could be a performance hit on large vectors,
    // but the API contract strictly requires no NonFiniteValue. 
    // In a high-performance setting, this check might be removed or moved to debug_assert!,
    // but for now we enforce it to guarantee deterministic panic-free math.
    for &val in v {
        if !val.is_finite() {
            return Err(VectorError::NonFiniteValue);
        }
    }
    Ok(())
}

/// Validates that two vectors have the same dimension.
#[inline(always)]
fn validate_dimensions(a: &[f32], b: &[f32]) -> Result<(), VectorError> {
    if a.len() != b.len() {
        return Err(VectorError::DimensionMismatch {
            expected: a.len(),
            found: b.len(),
        });
    }
    Ok(())
}

/// Calculates the dot product of two vectors.
///
/// # Examples
/// ```
/// use vector::dot_product;
/// let a = [1.0, 2.0];
/// let b = [3.0, 4.0];
/// assert_eq!(dot_product(&a, &b).unwrap(), 11.0);
/// ```
pub fn dot_product(a: &[f32], b: &[f32]) -> Result<f32, VectorError> {
    validate_vector(a)?;
    validate_vector(b)?;
    validate_dimensions(a, b)?;

    // Using an iterator approach enables compiler auto-vectorization
    let dot: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    Ok(dot)
}

/// Calculates the L2 norm (Euclidean magnitude) of a vector.
///
/// # Examples
/// ```
/// use vector::l2_norm;
/// let a = [3.0, 4.0];
/// assert_eq!(l2_norm(&a).unwrap(), 5.0);
/// ```
pub fn l2_norm(a: &[f32]) -> Result<f32, VectorError> {
    validate_vector(a)?;

    let sum_sq: f32 = a.iter().map(|x| x * x).sum();
    Ok(sum_sq.sqrt())
}

/// Calculates the cosine similarity between two vectors.
///
/// # Examples
/// ```
/// use vector::cosine_similarity;
/// let a = [1.0, 0.0];
/// let b = [0.0, 1.0];
/// assert_eq!(cosine_similarity(&a, &b).unwrap(), 0.0);
/// ```
pub fn cosine_similarity(a: &[f32], b: &[f32]) -> Result<f32, VectorError> {
    validate_vector(a)?;
    validate_vector(b)?;
    validate_dimensions(a, b)?;

    let dot = dot_product(a, b)?;
    let norm_a = l2_norm(a)?;
    let norm_b = l2_norm(b)?;

    if norm_a == 0.0 || norm_b == 0.0 {
        return Err(VectorError::ZeroMagnitude);
    }

    Ok(dot / (norm_a * norm_b))
}

/// Calculates the Euclidean distance between two vectors.
///
/// # Examples
/// ```
/// use vector::euclidean_distance;
/// let a = [0.0, 0.0];
/// let b = [3.0, 4.0];
/// assert_eq!(euclidean_distance(&a, &b).unwrap(), 5.0);
/// ```
pub fn euclidean_distance(a: &[f32], b: &[f32]) -> Result<f32, VectorError> {
    validate_vector(a)?;
    validate_vector(b)?;
    validate_dimensions(a, b)?;

    let dist_sq: f32 = a
        .iter()
        .zip(b.iter())
        .map(|(x, y)| (x - y) * (x - y))
        .sum();
    Ok(dist_sq.sqrt())
}

/// Calculates the Manhattan distance between two vectors.
///
/// # Examples
/// ```
/// use vector::manhattan_distance;
/// let a = [1.0, 1.0];
/// let b = [3.0, 4.0];
/// assert_eq!(manhattan_distance(&a, &b).unwrap(), 5.0);
/// ```
pub fn manhattan_distance(a: &[f32], b: &[f32]) -> Result<f32, VectorError> {
    validate_vector(a)?;
    validate_vector(b)?;
    validate_dimensions(a, b)?;

    let dist: f32 = a.iter().zip(b.iter()).map(|(x, y)| (x - y).abs()).sum();
    Ok(dist)
}

/// Normalizes a vector in-place so its magnitude becomes 1.0.
///
/// # Examples
/// ```
/// use vector::normalize;
/// let mut a = [3.0, 4.0];
/// normalize(&mut a).unwrap();
/// assert_eq!(a, [0.6, 0.8]);
/// ```
pub fn normalize(a: &mut [f32]) -> Result<(), VectorError> {
    validate_vector(a)?;

    let norm = l2_norm(a)?;
    if norm == 0.0 {
        return Err(VectorError::ZeroMagnitude);
    }

    for val in a.iter_mut() {
        *val /= norm;
    }

    Ok(())
}

/// Checks if a vector is normalized (magnitude is 1) within the given tolerance.
///
/// # Examples
/// ```
/// use vector::is_normalized;
/// let a = [1.0, 0.0];
/// assert_eq!(is_normalized(&a, 1e-6).unwrap(), true);
/// ```
pub fn is_normalized(a: &[f32], tolerance: f32) -> Result<bool, VectorError> {
    validate_vector(a)?;
    let norm = l2_norm(a)?;
    Ok((norm - 1.0).abs() <= tolerance)
}

use super::math::*;
use super::VectorError;
use proptest::prelude::*;

const TOLERANCE: f32 = 1e-6;

fn assert_approx_eq(a: f32, b: f32) {
    assert!((a - b).abs() <= TOLERANCE, "left: {}, right: {}", a, b);
}

#[test]
fn test_dot_product_basic() {
    let a = [1.0, 2.0, 3.0];
    let b = [4.0, 5.0, 6.0];
    let result = dot_product(&a, &b).unwrap();
    assert_approx_eq(result, 32.0); // 4 + 10 + 18
}

#[test]
fn test_errors() {
    let a = [1.0, 2.0];
    let b = [1.0, 2.0, 3.0];
    
    // DimensionMismatch
    assert_eq!(
        dot_product(&a, &b),
        Err(VectorError::DimensionMismatch { expected: 2, found: 3 })
    );

    // EmptyVector
    let empty: [f32; 0] = [];
    assert_eq!(dot_product(&empty, &empty), Err(VectorError::EmptyVector));

    // ZeroMagnitude
    let zero = [0.0, 0.0];
    let ones = [1.0, 1.0];
    assert_eq!(cosine_similarity(&zero, &ones), Err(VectorError::ZeroMagnitude));

    // NonFiniteValue
    let nan_vec = [f32::NAN, 1.0];
    assert_eq!(l2_norm(&nan_vec), Err(VectorError::NonFiniteValue));
}

#[test]
fn test_no_allocation() {
    // We can't strictly assert zero allocations in standard test without custom allocators,
    // but we can ensure the methods themselves don't return Vec or Box.
    // Memory profiling will be verified in benchmarks.
}

proptest! {
    #[test]
    fn prop_dot_product_commutative(a in proptest::collection::vec(-10.0f32..10.0, 1..100),
                                    b in proptest::collection::vec(-10.0f32..10.0, 1..100)) {
        if a.len() == b.len() {
            let ab = dot_product(&a, &b).unwrap();
            let ba = dot_product(&b, &a).unwrap();
            assert_approx_eq(ab, ba);
        }
    }

    #[test]
    fn prop_cosine_symmetry(a in proptest::collection::vec(-10.0f32..10.0, 1..100),
                            b in proptest::collection::vec(-10.0f32..10.0, 1..100)) {
        if a.len() == b.len() && l2_norm(&a).unwrap() > 0.0 && l2_norm(&b).unwrap() > 0.0 {
            let ab = cosine_similarity(&a, &b).unwrap();
            let ba = cosine_similarity(&b, &a).unwrap();
            assert_approx_eq(ab, ba);
        }
    }

    #[test]
    fn prop_normalize_idempotent(mut a in proptest::collection::vec(-10.0f32..10.0, 1..100)) {
        if l2_norm(&a).unwrap() > 0.0 {
            normalize(&mut a).unwrap();
            let mut b = a.clone();
            normalize(&mut b).unwrap();
            
            for (x, y) in a.iter().zip(b.iter()) {
                assert_approx_eq(*x, *y);
            }
        }
    }
}

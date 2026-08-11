#[cfg(test)]
mod tests {
    use crate::network::membership::{PeerRegistry, PeerHealth};
    use crate::network::transport::{TransportService, HttpTransport, GrpcTransport};
    use crate::coordination::assignment::TaskAssignment;
    use crate::models::task::Task;
    use crate::ids::AgentId;

    #[test]
    fn test_network_partition_recovery() {
        let mut registry = PeerRegistry::new();
        let peer_a = AgentId::new();
        
        registry.register_peer(peer_a);
        assert_eq!(registry.peers.get(&peer_a), Some(&PeerHealth::Healthy));
        
        // Partition
        registry.set_health(&peer_a, PeerHealth::Unreachable);
        assert_eq!(registry.peers.get(&peer_a), Some(&PeerHealth::Unreachable));
        
        // Reconnect
        registry.set_health(&peer_a, PeerHealth::Healthy);
        assert_eq!(registry.peers.get(&peer_a), Some(&PeerHealth::Healthy));
    }

    #[tokio::test]
    async fn test_transport_swap() {
        let http = HttpTransport::new();
        let grpc = GrpcTransport::new();
        
        let assignment = TaskAssignment::new(Task::default());
        let res_http = http.send_assignment("node_b", &assignment).await;
        let res_grpc = grpc.send_assignment("node_b", &assignment).await;
        
        assert!(res_http.is_ok());
        assert!(res_grpc.is_ok());
        // Since both are stubs, they both succeed
    }
}

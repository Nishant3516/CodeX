package k8s

import (
	"fmt"
	"os"
	"path/filepath"

	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
)

var (
	KubeConfig string
	ClientSet  *kubernetes.Clientset
)

func InitK8sClient() error {
	var err error
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return err
	}
	KubeConfig = filepath.Join(homeDir, ".kube", "config")
	config, err := clientcmd.BuildConfigFromFlags("", KubeConfig)
	if err != nil {
		return err
	}
	ClientSet, err = kubernetes.NewForConfig(config)
	return err
}

// InitK8sInCluster initializes a Kubernetes client using a service account token and API URL from environment variables.
func InitK8sInCluster() error {
	token := os.Getenv("K8S_SA_TOKEN")
	apiURL := os.Getenv("K8S_API_URL")
	if token == "" || apiURL == "" {
		return fmt.Errorf("K8S_SA_TOKEN or K8S_API_URL not set in environment")
	}
	// Build in-cluster config using bearer token
	cfg := &rest.Config{
		Host:        apiURL,
		BearerToken: token,
		TLSClientConfig: rest.TLSClientConfig{
			Insecure: true,
		},
	}
	var err error
	ClientSet, err = kubernetes.NewForConfig(cfg)
	return err
}

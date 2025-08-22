package k8s

import (
	"os"
	"path/filepath"

	"k8s.io/client-go/kubernetes"
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

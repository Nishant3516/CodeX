package k8s

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"text/template"

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/yaml"
)

// SpinUpParams holds all the variables needed for the templates.
type SpinUpParams struct {
	LabID                 string
	Language              string
	AppName               string
	S3Bucket              string
	S3Key                 string
	Namespace             string
	ShouldCreateNamespace bool
}

type SpinDownParams struct {
	LabID     string
	Language  string
	AppName   string
	Namespace string
}

// SpinUpPodWithLanguage orchestrates the creation of all necessary K8s resources.
func SpinUpPodWithLanguage(params SpinUpParams) error {
	log.Printf("Starting to spin up resources for LabID: %s, S3Bucket: %s, S3Key: %s", params.LabID, params.S3Bucket, params.S3Key)

	if params.ShouldCreateNamespace {
		if err := CreateNamespaceFromYamlIfDoesNotExists(params); err != nil {
			return fmt.Errorf("could not create namespace: %w", err)
		}
	}

	if err := CreateDeploymentFromYamlIfDoesNotExists(params); err != nil {
		return fmt.Errorf("could not create deployment: %w", err)
	}
	if err := CreateServiceFromYamlIfDoesNotExists(params); err != nil {
		return fmt.Errorf("could not create service: %w", err)
	}
	if err := CreateIngressFromYamlIfDoesNotExists(params); err != nil {
		return fmt.Errorf("could not create ingress: %w", err)
	}

	log.Printf("Successfully spun up all resources for LabID: %s", params.LabID)
	return nil
}

func CreateNamespaceFromYamlIfDoesNotExists(params SpinUpParams) error {
	yamlFilePath := "k8s/templates/namespace.yaml"
	if ClientSet == nil {
		return fmt.Errorf("kubernetes client not initialized; call k8s.InitK8sClient() before using k8s functions")
	}

	_, err := ClientSet.CoreV1().Namespaces().Get(context.TODO(), params.Namespace, metav1.GetOptions{})
	if err == nil {
		log.Printf("Namespace '%s' already exists, skipping.", params.Namespace)
		return nil
	}
	if !errors.IsNotFound(err) {
		return err
	}

	var processedYaml bytes.Buffer
	tmpl, err := template.ParseFiles(yamlFilePath)
	if err != nil {
		return fmt.Errorf("error parsing template file %s: %w", yamlFilePath, err)
	}
	// Note: Your namespace template used Helm syntax, this uses Go's.
	// You might need to adjust the template file itself.
	// Assuming a simple template: apiVersion: v1, kind: Namespace, metadata: { name: {{.Namespace}} }
	if err := tmpl.Execute(&processedYaml, params); err != nil {
		return fmt.Errorf("error executing template: %w", err)
	}

	var ns corev1.Namespace
	if err := yaml.Unmarshal(processedYaml.Bytes(), &ns); err != nil {
		return fmt.Errorf("error unmarshalling namespace YAML: %w", err)
	}

	log.Printf("Creating namespace '%s'", params.Namespace)
	_, err = ClientSet.CoreV1().Namespaces().Create(context.TODO(), &ns, metav1.CreateOptions{})
	return err
}

func CreateDeploymentFromYamlIfDoesNotExists(params SpinUpParams) error {
	yamlFilePath := "k8s/templates/deployment.template.yaml"
	deploymentName := fmt.Sprintf("%s-deployment", params.LabID)

	_, err := ClientSet.AppsV1().Deployments(params.Namespace).Get(context.TODO(), deploymentName, metav1.GetOptions{})
	if err == nil {
		log.Printf("Deployment '%s' already exists, skipping.", deploymentName)
		return nil
	}
	if !errors.IsNotFound(err) {
		return err
	}

	var processedYaml bytes.Buffer
	tmpl, err := template.ParseFiles(yamlFilePath)
	if err != nil {
		return err
	}
	if err := tmpl.Execute(&processedYaml, params); err != nil {
		return err
	}

	var deployment appsv1.Deployment
	if err := yaml.Unmarshal(processedYaml.Bytes(), &deployment); err != nil {
		return fmt.Errorf("error unmarshalling deployment YAML: %w", err)
	}

	log.Printf("Creating deployment '%s'", deployment.Name)
	_, err = ClientSet.AppsV1().Deployments(params.Namespace).Create(context.TODO(), &deployment, metav1.CreateOptions{})
	return err
}

func CreateServiceFromYamlIfDoesNotExists(params SpinUpParams) error {
	yamlFilePath := "k8s/templates/service.template.yaml"
	serviceName := fmt.Sprintf("%s-service", params.LabID)

	_, err := ClientSet.CoreV1().Services(params.Namespace).Get(context.TODO(), serviceName, metav1.GetOptions{})
	if err == nil {
		log.Printf("Service '%s' already exists, skipping.", serviceName)
		return nil
	}
	if !errors.IsNotFound(err) {
		return err
	}

	var processedYaml bytes.Buffer
	tmpl, err := template.ParseFiles(yamlFilePath)
	if err != nil {
		return err
	}
	if err := tmpl.Execute(&processedYaml, params); err != nil {
		return err
	}

	var service corev1.Service
	if err := yaml.Unmarshal(processedYaml.Bytes(), &service); err != nil {
		return fmt.Errorf("error unmarshalling service YAML: %w", err)
	}

	log.Printf("Creating service '%s'", service.Name)
	_, err = ClientSet.CoreV1().Services(params.Namespace).Create(context.TODO(), &service, metav1.CreateOptions{})
	return err
}

func CreateIngressFromYamlIfDoesNotExists(params SpinUpParams) error {
	yamlFilePath := "k8s/templates/ingress.template.yaml"
	ingressName := fmt.Sprintf("%s-ingress", params.LabID)

	_, err := ClientSet.NetworkingV1().Ingresses(params.Namespace).Get(context.TODO(), ingressName, metav1.GetOptions{})
	if err == nil {
		log.Printf("Ingress '%s' already exists, skipping.", ingressName)
		return nil
	}
	if !errors.IsNotFound(err) {
		return err
	}

	var processedYaml bytes.Buffer
	tmpl, err := template.ParseFiles(yamlFilePath)
	if err != nil {
		return err
	}
	if err := tmpl.Execute(&processedYaml, params); err != nil {
		return err
	}

	var ingress networkingv1.Ingress
	if err := yaml.Unmarshal(processedYaml.Bytes(), &ingress); err != nil {
		return fmt.Errorf("error unmarshalling ingress YAML: %w", err)
	}

	log.Printf("Creating ingress '%s'", ingress.Name)
	_, err = ClientSet.NetworkingV1().Ingresses(params.Namespace).Create(context.TODO(), &ingress, metav1.CreateOptions{})
	return err
}

// TearDownPodWithLanguage removes the resources created for a lab.
func TearDownPodWithLanguage(params SpinDownParams) error {
	if ClientSet == nil {
		return fmt.Errorf("kubernetes client not initialized; call k8s.InitK8sClient() before using k8s functions")
	}

	deploymentName := fmt.Sprintf("%s-deployment", params.LabID)
	serviceName := fmt.Sprintf("%s-service", params.LabID)
	ingressName := fmt.Sprintf("%s-ingress", params.LabID)

	// Delete Deployment
	if err := ClientSet.AppsV1().Deployments(params.Namespace).Delete(context.TODO(), deploymentName, metav1.DeleteOptions{}); err != nil {
		if !errors.IsNotFound(err) {
			log.Printf("Failed to delete deployment %s: %v", deploymentName, err)
			return err
		}
	}

	// Delete Service
	if err := ClientSet.CoreV1().Services(params.Namespace).Delete(context.TODO(), serviceName, metav1.DeleteOptions{}); err != nil {
		if !errors.IsNotFound(err) {
			log.Printf("Failed to delete service %s: %v", serviceName, err)
			return err
		}
	}

	// Delete Ingress
	if err := ClientSet.NetworkingV1().Ingresses(params.Namespace).Delete(context.TODO(), ingressName, metav1.DeleteOptions{}); err != nil {
		if !errors.IsNotFound(err) {
			log.Printf("Failed to delete ingress %s: %v", ingressName, err)
			return err
		}
	}

	// Optionally delete namespace if desired - skipping to keep shared namespace
	log.Printf("Teardown completed for LabID: %s", params.LabID)
	return nil
}

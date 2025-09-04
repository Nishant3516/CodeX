package k8s

import (
	"bytes"
	"context"
	"fmt"
	"lms_v0/utils"
	"log"
	"text/template"
	"time"

	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/yaml"
)

var sslStartTime time.Time

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
	progress := utils.LabProgressEntry{
		Timestamp:   time.Now().Unix(),
		Status:      utils.Booting,
		Message:     "Starting to spin up resources",
		ServiceName: utils.SERVER_SERVICE,
	}
	utils.RedisUtilsInstance.UpdateLabInstanceProgress(params.LabID, progress)

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
	if err := CreateSSLProgressJobFromYamlIfDoesNotExists(params); err != nil {
		return fmt.Errorf("could not create SSL progress job: %w", err)
	}
	if err := CreateCleanupCronJobFromYamlIfDoesNotExists(params); err != nil {
		return fmt.Errorf("could not create cleanup cronjob: %w", err)
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

	if err := tmpl.Execute(&processedYaml, params); err != nil {
		return fmt.Errorf("error executing template: %w", err)
	}

	var ns corev1.Namespace
	if err := yaml.Unmarshal(processedYaml.Bytes(), &ns); err != nil {
		return fmt.Errorf("error unmarshalling namespace YAML: %w", err)
	}

	log.Printf("Creating namespace '%s'", params.Namespace)
	_, err = ClientSet.CoreV1().Namespaces().Create(context.TODO(), &ns, metav1.CreateOptions{})
	if err != nil {
		return err
	}

	// Update progress for namespace creation
	progress := utils.LabProgressEntry{
		Timestamp:   time.Now().Unix(),
		Status:      utils.Booting,
		Message:     fmt.Sprintf("Namespace '%s' created successfully", params.Namespace),
		ServiceName: utils.SERVER_SERVICE,
	}
	utils.RedisUtilsInstance.UpdateLabInstanceProgress(params.LabID, progress)
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
	if err != nil {
		return err
	}

	// Update progress for deployment creation
	progress := utils.LabProgressEntry{
		Timestamp:   time.Now().Unix(),
		Status:      utils.Booting,
		Message:     fmt.Sprintf("Deployment '%s' created successfully", deployment.Name),
		ServiceName: utils.SERVER_SERVICE,
	}
	utils.RedisUtilsInstance.UpdateLabInstanceProgress(params.LabID, progress)
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
	if err != nil {
		return err
	}

	// Update progress for service creation
	progress := utils.LabProgressEntry{
		Timestamp:   time.Now().Unix(),
		Status:      utils.Booting,
		Message:     fmt.Sprintf("Service '%s' created successfully", service.Name),
		ServiceName: utils.SERVER_SERVICE,
	}
	utils.RedisUtilsInstance.UpdateLabInstanceProgress(params.LabID, progress)
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
	sslStartTime = time.Now()
	_, err = ClientSet.NetworkingV1().Ingresses(params.Namespace).Create(context.TODO(), &ingress, metav1.CreateOptions{})
	if err != nil {
		return err
	}
	log.Printf("[SSL TIMING] Ingress '%s' created at %s (SSL process starts)", ingress.Name, sslStartTime.Format(time.RFC3339))

	// Update progress for ingress creation
	progress := utils.LabProgressEntry{
		Timestamp:   time.Now().Unix(),
		Status:      utils.Booting,
		Message:     fmt.Sprintf("Ingress '%s' created successfully", ingress.Name),
		ServiceName: utils.SERVER_SERVICE,
	}
	utils.RedisUtilsInstance.UpdateLabInstanceProgress(params.LabID, progress)

	return err
}

func CreateSSLProgressJobFromYamlIfDoesNotExists(params SpinUpParams) error {
	yamlFilePath := "k8s/templates/ssl-progress-job.template.yaml"
	jobName := fmt.Sprintf("%s-ssl-progress-job", params.LabID)

	_, err := ClientSet.BatchV1().Jobs(params.Namespace).Get(context.TODO(), jobName, metav1.GetOptions{})
	if err == nil {
		log.Printf("Job '%s' already exists, skipping.", jobName)
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

	var job batchv1.Job
	if err := yaml.Unmarshal(processedYaml.Bytes(), &job); err != nil {
		return fmt.Errorf("error unmarshalling job YAML: %w", err)
	}

	log.Printf("Creating job '%s'", job.Name)
	jobCreateStart := time.Now()
	_, err = ClientSet.BatchV1().Jobs(params.Namespace).Create(context.TODO(), &job, metav1.CreateOptions{})
	if err != nil {
		return err
	}
	log.Printf("[SSL TIMING] SSL progress job '%s' created in %v", job.Name, time.Since(jobCreateStart))

	log.Printf("SSL progress job '%s' created successfully", job.Name)

	// Don't wait for job completion - progress monitoring is now async
	log.Printf("SSL progress monitoring started asynchronously for LabID: %s", params.LabID)

	return nil
}

func CreateCleanupCronJobFromYamlIfDoesNotExists(params SpinUpParams) error {
	// First create the ConfigMap if it doesn't exist
	if err := CreateCleanupConfigMapIfDoesNotExists(); err != nil {
		return fmt.Errorf("could not create cleanup configmap: %w", err)
	}

	// Create the Secret if it doesn't exist
	if err := CreateCleanupSecretIfDoesNotExists(); err != nil {
		return fmt.Errorf("could not create cleanup secret: %w", err)
	}

	yamlFilePath := "k8s/templates/cleanup-cronjob.template.yaml"
	cronJobName := "lab-cleanup-cronjob"

	_, err := ClientSet.BatchV1().CronJobs(params.Namespace).Get(context.TODO(), cronJobName, metav1.GetOptions{})
	if err == nil {
		log.Printf("Shared cleanup CronJob '%s' already exists, skipping.", cronJobName)
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

	var cronJob batchv1.CronJob
	if err := yaml.Unmarshal(processedYaml.Bytes(), &cronJob); err != nil {
		return fmt.Errorf("error unmarshalling cronjob YAML: %w", err)
	}

	log.Printf("Creating shared cleanup cronjob '%s'", cronJob.Name)
	_, err = ClientSet.BatchV1().CronJobs(params.Namespace).Create(context.TODO(), &cronJob, metav1.CreateOptions{})
	if err != nil {
		return err
	}

	log.Printf("Shared cleanup cronjob '%s' created successfully", cronJob.Name)

	return nil
}

func CreateCleanupConfigMapIfDoesNotExists() error {
	yamlFilePath := "k8s/templates/cleanup-configmap.template.yaml"
	configMapName := "lab-cleanup-config"
	namespace := "devsarena"

	_, err := ClientSet.CoreV1().ConfigMaps(namespace).Get(context.TODO(), configMapName, metav1.GetOptions{})
	if err == nil {
		log.Printf("Cleanup ConfigMap '%s' already exists, skipping.", configMapName)
		return nil
	}
	if !errors.IsNotFound(err) {
		return err
	}

	var processedYaml bytes.Buffer
	tmpl, err := template.ParseFiles(yamlFilePath)
	if err != nil {
		return fmt.Errorf("error parsing configmap template file %s: %w", yamlFilePath, err)
	}

	if err := tmpl.Execute(&processedYaml, nil); err != nil {
		return fmt.Errorf("error executing configmap template: %w", err)
	}

	var configMap corev1.ConfigMap
	if err := yaml.Unmarshal(processedYaml.Bytes(), &configMap); err != nil {
		return fmt.Errorf("error unmarshalling configmap YAML: %w", err)
	}

	log.Printf("Creating cleanup ConfigMap '%s'", configMap.Name)
	_, err = ClientSet.CoreV1().ConfigMaps(namespace).Create(context.TODO(), &configMap, metav1.CreateOptions{})
	if err != nil {
		return err
	}

	log.Printf("Cleanup ConfigMap '%s' created successfully", configMap.Name)

	return nil
}

func CreateCleanupSecretIfDoesNotExists() error {
	yamlFilePath := "k8s/templates/cleanup-secret.template.yaml"
	secretName := "lab-cleanup-secrets"
	namespace := "devsarena"

	_, err := ClientSet.CoreV1().Secrets(namespace).Get(context.TODO(), secretName, metav1.GetOptions{})
	if err == nil {
		log.Printf("Cleanup Secret '%s' already exists, skipping.", secretName)
		return nil
	}
	if !errors.IsNotFound(err) {
		return err
	}

	var processedYaml bytes.Buffer
	tmpl, err := template.ParseFiles(yamlFilePath)
	if err != nil {
		return fmt.Errorf("error parsing secret template file %s: %w", yamlFilePath, err)
	}

	if err := tmpl.Execute(&processedYaml, nil); err != nil {
		return fmt.Errorf("error executing secret template: %w", err)
	}

	var secret corev1.Secret
	if err := yaml.Unmarshal(processedYaml.Bytes(), &secret); err != nil {
		return fmt.Errorf("error unmarshalling secret YAML: %w", err)
	}

	log.Printf("Creating cleanup Secret '%s'", secret.Name)
	_, err = ClientSet.CoreV1().Secrets(namespace).Create(context.TODO(), &secret, metav1.CreateOptions{})
	if err != nil {
		return err
	}

	log.Printf("Cleanup Secret '%s' created successfully", secret.Name)

	return nil
}

func CreateCleanupTestJobFromYamlIfDoesNotExists(params SpinUpParams) error {
	yamlFilePath := "k8s/templates/cleanup-test-job.template.yaml"
	jobName := "lab-cleanup-test-job"

	_, err := ClientSet.BatchV1().Jobs(params.Namespace).Get(context.TODO(), jobName, metav1.GetOptions{})
	if err == nil {
		log.Printf("Cleanup test job '%s' already exists, skipping.", jobName)
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

	if err := tmpl.Execute(&processedYaml, params); err != nil {
		return fmt.Errorf("error executing template: %w", err)
	}

	var job batchv1.Job
	if err := yaml.Unmarshal(processedYaml.Bytes(), &job); err != nil {
		return fmt.Errorf("error unmarshalling test job YAML: %w", err)
	}

	log.Printf("Creating cleanup test job '%s'", job.Name)
	_, err = ClientSet.BatchV1().Jobs(params.Namespace).Create(context.TODO(), &job, metav1.CreateOptions{})
	if err != nil {
		return err
	}

	log.Printf("Cleanup test job '%s' created successfully", job.Name)

	return nil
}

// TearDownPodWithLanguage removes the resources created for a lab.
func TearDownPodWithLanguage(params SpinDownParams) error {
	if ClientSet == nil {
		return fmt.Errorf("kubernetes client not initialized; call k8s.InitK8sClient() before using k8s functions")
	}

	deploymentName := fmt.Sprintf("%s-deployment", params.LabID)
	serviceName := fmt.Sprintf("%s-service", params.LabID)
	ingressName := fmt.Sprintf("%s-ingress", params.LabID)
	jobName := fmt.Sprintf("%s-ssl-progress-job", params.LabID)

	backgroundDeletion := metav1.DeletePropagationBackground

	if err := ClientSet.BatchV1().Jobs(params.Namespace).Delete(context.TODO(), jobName, metav1.DeleteOptions{
		PropagationPolicy: &backgroundDeletion,
	}); err != nil {
		if !errors.IsNotFound(err) {
			log.Printf("Failed to delete SSL progress job %s: %v", jobName, err)
			return err
		}
	} else {
		log.Printf("SSL progress job %s deleted successfully", jobName)
	}

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

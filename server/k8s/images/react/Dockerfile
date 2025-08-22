# Use a lightweight Node.js base image which includes node, npm, and a shell
FROM node:22-alpine

# Install the 'serve' package globally so the user can
# run 'serve -s build' to host their production app.
RUN npm install -g serve

# Create a non-root user and group for security
RUN addgroup -S devarena-group && adduser -S devarena-user -G devarena-group

# Create and set ownership for the workspace directory
# The user will have full read/write permissions here, but not elsewhere.
RUN mkdir /workspace && chown devarena-user:devarena-group /workspace

# Switch to the non-root user
USER devarena-user

# Set the working directory, so the user's shell starts here
WORKDIR /workspace
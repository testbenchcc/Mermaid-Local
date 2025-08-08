# commit-and-tag.ps1

# Prompt for commit message
$CommitMessage = Read-Host "Enter commit message"

# Ensure we're in a Git repo
if (-not (Test-Path ".git")) {
    Write-Error "This folder is not a Git repository."
    exit 1
}

# Stage all changes
git add -A

# Commit changes
git commit -m "$CommitMessage"

# Get the build number (commit count)
$buildNumber = git rev-list --count HEAD

# Create tag name
$tagName = "build-$buildNumber"

# Create the tag
git tag -a $tagName -m "Build number $buildNumber"

# Push commits and tags
git push
git push origin $tagName

Write-Host "Committed and tagged as $tagName"

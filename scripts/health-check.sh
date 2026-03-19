#!/bin/bash
curl -f http://localhost:3000/health > /dev/null 2>&1 && echo "✓ Backend health check passed" || echo "✗ Backend health check failed"

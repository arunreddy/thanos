from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.user import User


class UserRepository:
    """Repository for user CRUD operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_user(
        self,
        email: str,
        display_name: Optional[str] = None,
        okta_user_id: Optional[str] = None,
        preferred_username: Optional[str] = None,
        given_name: Optional[str] = None,
        family_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
        preferences: Optional[dict] = None
    ) -> User:
        """Create a new user"""
        user = User(
            email=email,
            display_name=display_name,
            okta_user_id=okta_user_id,
            preferred_username=preferred_username,
            given_name=given_name,
            family_name=family_name,
            avatar_url=avatar_url,
            preferences=preferences or {}
        )
        
        try:
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
            return user
        except IntegrityError:
            self.db.rollback()
            raise ValueError("User with this email or Okta ID already exists")
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()
    
    def get_user_by_okta_id(self, okta_user_id: str) -> Optional[User]:
        """Get user by Okta user ID"""
        return self.db.query(User).filter(User.okta_user_id == okta_user_id).first()
    
    def get_or_create_user_from_okta(self, okta_user_info: dict) -> User:
        """Get existing user or create new user from Okta user info"""
        email = okta_user_info.get("email")
        okta_user_id = okta_user_info.get("sub")  # Okta user ID is in 'sub' field
        
        if not email:
            raise ValueError("Email is required to create user")
        
        # Try to find existing user by Okta ID first, then by email
        user = None
        if okta_user_id:
            user = self.get_user_by_okta_id(okta_user_id)
        
        if not user:
            user = self.get_user_by_email(email)
        
        if user:
            # Update user information from Okta
            user.okta_user_id = okta_user_id
            user.preferred_username = okta_user_info.get("preferred_username")
            user.given_name = okta_user_info.get("given_name")
            user.family_name = okta_user_info.get("family_name")
            user.display_name = okta_user_info.get("name") or user.display_name
            user.last_active_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(user)
            return user
        
        # Create new user
        return self.create_user(
            email=email,
            display_name=okta_user_info.get("name"),
            okta_user_id=okta_user_id,
            preferred_username=okta_user_info.get("preferred_username"),
            given_name=okta_user_info.get("given_name"),
            family_name=okta_user_info.get("family_name")
        )
    
    def update_user(self, user_id: str, **updates) -> Optional[User]:
        """Update user fields"""
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        
        for field, value in updates.items():
            if hasattr(user, field):
                setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        return user
    
    def update_last_active(self, user_id: str) -> Optional[User]:
        """Update user's last active timestamp"""
        return self.update_user(user_id, last_active_at=datetime.utcnow())
    
    def delete_user(self, user_id: str) -> bool:
        """Delete user and all associated data"""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        self.db.delete(user)
        self.db.commit()
        return True
    
    def list_users(self, limit: int = 50, offset: int = 0) -> List[User]:
        """List users with pagination"""
        return self.db.query(User).offset(offset).limit(limit).all()
    
    def count_users(self) -> int:
        """Count total number of users"""
        return self.db.query(User).count()
package types

import (
	"crypto/md5"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/sessions"
	store "gopkg.in/boj/redistore.v1"
)

var sessionStore *store.RediStore

func InitSessionStore(c *Config) error {
	var err error
	// pairs: authentication/encryption (encryption is optional)
	// pairs can be added for key rotation (old keys at the end)
	sessionStore, err = store.NewRediStoreWithPool(redisPool, []byte(c.CookieStoreKey), nil)
	if err != nil {
		return err
	}

	return nil
}

func SetMaxAge(days int) {
	sessionStore.SetMaxAge(days * 24 * 3600)
}

func GetAdminSession(r *http.Request, w http.ResponseWriter) (*AdminSession, error) {
	session, err := sessionStore.Get(r, "session-admin")
	if err != nil {
		return nil, err
	}

	adminSession := &AdminSession{session: session, reader: r, writer: w}

	return adminSession, nil
}

func GetUserSession(r *http.Request, w http.ResponseWriter) (*UserSession, error) {
	userSession := &UserSession{reader: r, writer: w}
	userSession.load()
	return userSession, nil
}

// ...
type AdminSession struct {
	session *sessions.Session
	reader  *http.Request
	writer  http.ResponseWriter
}

// ...
func (as *AdminSession) IsAuthenticated() bool {
	if auth, ok := as.session.Values["authenticated"].(bool); ok && auth {
		return true
	}
	return false
}

func (as *AdminSession) Save() {
	as.session.Save(as.reader, as.writer)
}

func (as *AdminSession) Login() {
	as.session.Values["authenticated"] = true
	as.Save()
}

func (as *AdminSession) Logout() {
	as.session.Values["authenticated"] = false
	as.Save()
}

// ...
type UserSession struct {
	// session *sessions.Session
	reader *http.Request
	writer http.ResponseWriter

	Name          string `json:"name,omitempty"`
	Email         string `json:"email,omitempty"`
	Website       string `json:"website,omitempty"`
	Twitter       string `json:"twitter,omitempty"`
	RememberInfo  bool   `json:"remember-info,omitempty"`
	EmailOnAnswer bool   `json:"email-on-answer,omitempty"`

	GravatarHash string `json:"-"`
}

const (
	userNameDefault          = ""
	userEmailDefault         = ""
	userWebsiteDefault       = ""
	userTwitterDefault       = ""
	userRememberInfoDefault  = true
	userEmailOnAnswerDefault = true
)

func (us *UserSession) load() error {

	cookie, err := us.reader.Cookie("preferences")
	if err != nil {
		// http: named cookie not present
		if err.Error() == "http: named cookie not present" {
			// set default values in that case
			us.Name = userNameDefault
			us.Email = userEmailDefault
			us.Website = userWebsiteDefault
			us.Twitter = userTwitterDefault
			us.RememberInfo = userRememberInfoDefault
			us.EmailOnAnswer = userEmailOnAnswerDefault
			return nil
		}
		fmt.Println("can't read cookie:", err.Error())
		return err
	}

	jsonBytes, err := base64.StdEncoding.DecodeString(cookie.Value)
	if err != nil {
		fmt.Println("can't decode cookie:", err.Error())
		return err
	}

	err = json.Unmarshal(jsonBytes, us)
	if err != nil {
		fmt.Println("can't unmarshal json:", err.Error())
		return err
	}

	hash := md5.Sum([]byte(us.Email))
	us.GravatarHash = fmt.Sprintf("%x", hash)

	return nil
}

func (us *UserSession) Save() error {

	var jsonBytes []byte
	var err error

	cookie := &http.Cookie{}
	cookie.Name = "preferences"
	// cookie.Secure = true
	cookie.HttpOnly = true

	// only save that info shouldn't be remembered
	// + EmailOnAnswer
	if us.RememberInfo == true {
		jsonBytes, err = json.Marshal(us)
		if err != nil {
			return err
		}
		cookie.Value = base64.StdEncoding.EncodeToString(jsonBytes)
		cookie.Expires = time.Now().Add(time.Hour * 24 * 365)
	} else {
		cookie.MaxAge = -1 // delete cookie
		cookie.Value = ""
	}

	http.SetCookie(us.writer, cookie)
	return nil
}

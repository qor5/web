package web

import "fmt"

type idEventFunc struct {
	id string
	ef EventFunc
}

type EventsHub struct {
	eventFuncs []*idEventFunc
}

func (p *EventsHub) String() string {
	var rs []string
	for _, ne := range p.eventFuncs {
		rs = append(rs, ne.id)
	}
	return fmt.Sprintf("%#+v", rs)
}

func (p *EventsHub) RegisterEventFunc(eventFuncId string, ef EventFunc) (key string) {
	key = eventFuncId
	if p.eventFuncById(eventFuncId) != nil {
		return
	}

	p.eventFuncs = append(p.eventFuncs, &idEventFunc{eventFuncId, ef})
	return
}

func (p *EventsHub) addMultipleEventFuncs(vs ...interface{}) (key string) {
	if len(vs)%2 != 0 {
		panic("id and func not paired")
	}
	for i := 0; i < len(vs); i = i + 2 {
		p.RegisterEventFunc(vs[i].(string), vs[i+1].(func(ctx *EventContext) (r EventResponse, err error)))
	}
	return
}

func (p *EventsHub) eventFuncById(id string) (r EventFunc) {
	for _, ne := range p.eventFuncs {
		if ne.id == id {
			r = ne.ef
			return
		}
	}
	return
}
